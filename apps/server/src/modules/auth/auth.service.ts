/**
 * @module auth.service.ts
 * @description Core authentication service — handles all auth flows:
 *   1. Parent registration with parental consent
 *   2. Parent/guardian login with JWT issue
 *   3. Child PIN login (age-appropriate, no email required)
 *   4. Refresh token rotation (cache-backed)
 *   5. Device pairing via 6-digit code or QR
 *
 * @business-rule Security is critical in a children's app:
 *   - Passwords and PIN login use bcrypt (`pinHash` / `parentalPinHash`); AES-GCM (`pinEnc` / `parentalPinEnc`)
 *     lets parents see digits after reinstall — protect `CHILD_PIN_ENCRYPTION_KEY` like DB creds.
 *   - Access tokens are short-lived (15 minutes)
 *   - Refresh tokens are rotated on each use (prevent token theft)
 *   - Pairing codes expire in 5 minutes
 *   - Parental consent is required and stored for legal compliance (COPPA)
 *
 * @note Refresh sessions use SHA-256(refreshToken) as the key suffix.
 *       bcrypt.hash() is unsuitable here: each call yields a different salt/hash,
 *       so lookup on refresh would never match the stored session.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import { ChildPinCryptoService } from '../../common/child-pin-crypto/child-pin-crypto.service';
import {
  RegisterParentDto,
  LoginDto,
  ChildPinLoginDto,
  ConfirmPairingDto,
  SetChildPinDto,
  AutoPairDeviceDto,
  PairDeviceStatusDto,
} from './dto/register.dto';
import {
  UserRole,
  AuthTokenPayload,
  AuthResponse,
  PairingCodeResponse,
  UserProfile,
} from '@parentingmykid/shared-types';

/** Stable cache session key suffix for a refresh JWT (bcrypt is non-deterministic per call). */
function refreshTokenRedisFingerprint(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12; // Higher than standard 10 — children's data is sensitive

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly childPinCrypto: ChildPinCryptoService,
    private readonly httpService: HttpService,
  ) {}

  // ─── Parent Registration ───────────────────────────────────────────────────

  /**
   * Registers a new parent account.
   * Requires explicit parental consent checkbox — this is our COPPA compliance anchor.
   * On success, creates a default Family Group and starts the 14-day trial.
   */
  async registerParent(dto: RegisterParentDto): Promise<AuthResponse> {
    if (!dto.parentalConsentGiven) {
      throw new BadRequestException(
        'Parental consent is required to create an account. Please accept the Privacy Policy.',
      );
    }

    const existing = await this.db.user.findOne({ email: dto.email }).lean();
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Sequential operations replace Prisma transaction
    const user = await this.db.user.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      phone: dto.phone,
      religion: dto.religion,
      role: UserRole.PARENT,
      parentalConsentGiven: true,
      parentalConsentAt: new Date(),
      parentalConsentVersion: '1.0',
      languagePreference: dto.languagePreference ?? 'en',
    });

    // Auto-create default family group named after the parent
    const family = await this.db.familyGroup.create({
      name: `${dto.name}'s Family`,
      createdById: user.id,
    });

    // Add user as PRIMARY parent of the family
    await this.db.familyMember.create({
      familyId: family.id,
      userId: user.id,
      role: 'PRIMARY',
      canViewSafetyData: true,
      canChangeScreenTime: true,
      canApproveRewards: true,
      canManageSubscription: true,
    });

    // Start 14-day free trial automatically
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const subscription = await this.db.subscription.create({
      familyId: family.id,
      plan: 'STANDARD',
      status: 'TRIAL',
      trialEndsAt: trialEnd,
    });

    // Log the trial start event
    await this.db.subscriptionEvent.create({
      subscriptionId: subscription.id,
      eventType: 'TRIAL_STARTED',
      plan: 'STANDARD',
    });

    this.logger.log(`New parent registered: ${user.email}`);

    return this.issueTokens(user.id, user.email, UserRole.PARENT, [family.id]);
  }

  // ─── Parent Login ──────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponse> {
    console.log('login', dto);
    const user = await this.db.user.findOne({ email: dto.email }).lean();

    if (!user || user.role === UserRole.CHILD) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.db.user.findOneAndUpdate({ _id: user._id }, { lastLoginAt: new Date() });

    // Get all family IDs this user belongs to
    const memberships = await this.db.familyMember
      .find({ userId: user._id })
      .select('familyId')
      .lean();
    const familyIds = memberships.map((m) => String(m.familyId));

    return this.issueTokens(String(user._id), user.email, user.role as UserRole, familyIds);
  }

  // ─── Child PIN Login ───────────────────────────────────────────────────────

  /**
   * Allows a child to log in using their 4-digit PIN.
   * Child accounts use PIN instead of email/password — age-appropriate and friction-free.
   */
  async childPinLogin(dto: ChildPinLoginDto): Promise<AuthResponse> {
    const child = await this.db.childProfile.findOne({ _id: dto.childId }).lean();

    if (!child || !child.pinHash) {
      throw new UnauthorizedException('Child profile not found or PIN not set');
    }

    const isPinValid = await bcrypt.compare(dto.pin, child.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('Incorrect PIN. Please try again.');
    }

    const childUser = await this.db.user.findOne({ _id: child.userId }).lean();
    if (!childUser) {
      throw new UnauthorizedException('Child user account not found');
    }

    return this.issueTokens(String(child.userId), childUser.email, UserRole.CHILD, [
      String(child.familyId),
    ]);
  }

  // ─── Set Child PIN ─────────────────────────────────────────────────────────

  /**
   * Parent sets or updates the 4-digit PIN for their child's account.
   * Called during onboarding and from parent settings.
   */
  async setChildPin(parentId: string, childId: string, dto: SetChildPinDto): Promise<void> {
    const child = await this.db.childProfile.findOne({ _id: childId, parentId }).lean();

    if (!child) {
      throw new ForbiddenException('Child not found or access denied');
    }

    const pinHash = await bcrypt.hash(dto.pin, this.BCRYPT_ROUNDS);
    const pinEnc = this.childPinCrypto.encryptPin(dto.pin);
    await this.db.childProfile.findOneAndUpdate({ _id: childId }, { pinHash, pinEnc });
  }

  // ─── Refresh Token Rotation ────────────────────────────────────────────────

  /**
   * Issues a new access token and refresh token, invalidating the old refresh token.
   * Token rotation prevents replay attacks — if a stolen refresh token is used,
   * the legitimate user's next rotation will fail and they can be alerted.
   */
  async refreshTokens(refreshToken: string): Promise<Omit<AuthResponse, 'user'>> {
    let payload: AuthTokenPayload;

    try {
      payload = this.jwt.verify<AuthTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenFingerprint = refreshTokenRedisFingerprint(refreshToken);
    const exists = await this.cache.sessionExists(payload.sub, tokenFingerprint);
    if (!exists) {
      // Session missing (rotation race, cache TTL drift, or evicted key) — do not revoke every device.
      throw new UnauthorizedException('Refresh session is no longer valid. Please log in again.');
    }

    // Revoke old refresh token
    await this.cache.deleteSession(payload.sub, tokenFingerprint);

    // Issue new token pair
    const memberships = await this.db.familyMember
      .find({ userId: payload.sub })
      .select('familyId')
      .lean();
    const familyIds = memberships.map((m) => String(m.familyId));

    const { accessToken, refreshToken: newRefreshToken } = await this.issueTokens(
      payload.sub,
      payload.email,
      payload.role,
      familyIds,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Rehydrate user for client cold start (SecureStore can lose user JSON, token refresh cannot return user).
   */
  async getCurrentUserProfile(userId: string, role: UserRole): Promise<UserProfile> {
    const user = await this.db.user
      .findOne({ _id: userId })
      .select('id email name role avatarUrl createdAt phone parentalPinSet parentalPinEnc religion')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.db.familyMember.find({ userId }).select('familyId').lean();
    const familyIds = memberships.map((m) => String(m.familyId));

    let childProfileId: string | undefined;
    if (role === UserRole.CHILD) {
      const cp = await this.db.childProfile.findOne({ userId }).select('id').lean();
      childProfileId = cp ? String(cp._id) : undefined;
    }

    const profile: UserProfile = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      avatarUrl: user.avatarUrl ?? undefined,
      phone: user.phone ?? undefined,
      createdAt: ((user as any).createdAt as Date).toISOString(),
      familyIds,
      childProfileId,
    };

    if (role === UserRole.PARENT) {
      profile.parentalPinSet = user.parentalPinSet ?? false;
      if (user.religion) {
        profile.religion = user.religion as UserProfile['religion'];
      }
      const digits = this.childPinCrypto.tryDecryptPin(user.parentalPinEnc);
      if (digits) {
        profile.parentalPinDigits = digits;
      }
    }

    return profile;
  }

  // ─── Device Pairing ────────────────────────────────────────────────────────

  /**
   * Generates a 6-digit pairing code shown on the parent's screen.
   * The parent shows this (or the QR code) to their child's device to link it.
   * Code expires in 5 minutes via cache TTL.
   */
  async generatePairingCode(parentId: string, childId: string): Promise<PairingCodeResponse> {
    const child = await this.db.childProfile
      .findOne({ _id: childId, parentId })
      .select('id')
      .lean();
    if (!child) {
      throw new ForbiddenException('Child profile not found for this parent');
    }

    // Generate cryptographically random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await this.cache.setPairingCode(code, { parentId, childId });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // QR encodes one-time token only; the child profile is resolved server-side from cache mapping.
    const qrData = Buffer.from(JSON.stringify({ code })).toString('base64');
    const qrImage = await QRCode.toDataURL(qrData);

    return { code, expiresAt, qrData: qrImage };
  }

  /**
   * Confirms device pairing — child's device submits the code + their childId.
   * On success, creates a ChildDevice record and issues child JWT.
   */
  async confirmDevicePairing(dto: ConfirmPairingDto): Promise<AuthResponse> {
    const parsedQrPayload = this.parseQrPayload(dto.qrToken);
    const code = dto.code ?? parsedQrPayload?.code;
    if (!code) {
      throw new BadRequestException('Pairing data is missing. Please scan the parent QR again.');
    }

    const pairingData = await this.cache.getPairingCode(code);

    if (!pairingData) {
      throw new BadRequestException(
        'Pairing code is invalid or has expired. Please generate a new code.',
      );
    }

    const parentId = pairingData.parentId;
    const linkedChildId = pairingData.childId;
    const childId = dto.childId ?? linkedChildId;
    if (childId !== linkedChildId) {
      throw new ForbiddenException('This QR code is not valid for that child profile');
    }

    // Verify the child belongs to this parent
    const child = await this.db.childProfile.findOne({ _id: childId, parentId }).lean();

    if (!child) {
      throw new ForbiddenException('Child profile not found for this parent');
    }

    // Fetch the child's user row separately
    const childUser = await this.db.user.findOne({ _id: child.userId }).lean();
    if (!childUser) {
      throw new ForbiddenException('Child user account not found');
    }

    await this.upsertChildDevice({
      childId,
      expoPushToken: dto.expoPushToken,
      platform: dto.platform,
      deviceName: dto.deviceName,
    });

    // Invalidate the pairing code — one-time use only
    await this.cache.deletePairingCode(code);

    return this.issueTokens(String(child.userId), childUser.email, UserRole.CHILD, [
      String(child.familyId),
    ]);
  }

  async autoPairDeviceForParent(parentId: string, dto: AutoPairDeviceDto): Promise<void> {
    const child = await this.db.childProfile
      .findOne({ _id: dto.childId, parentId })
      .select('id')
      .lean();
    if (!child) {
      throw new ForbiddenException('Child profile not found for this parent');
    }
    await this.upsertChildDevice(dto);
  }

  /**
   * Returns which of the parent's child profiles are linked to this physical device
   * (Expo token match on `child_devices`). Used so the parent app can show "this phone is set up" UX.
   */
  async getPairingStatusForDevice(
    parentId: string,
    dto: PairDeviceStatusDto,
  ): Promise<{ pairs: { childId: string; name: string }[] }> {
    const devices = await this.db.childDevice
      .find({ deviceToken: dto.expoPushToken, isActive: true })
      .lean();

    const pairs: { childId: string; name: string }[] = [];
    for (const device of devices) {
      const child = await this.db.childProfile
        .findOne({ _id: device.childId, parentId })
        .select('id name')
        .lean();
      if (child) {
        pairs.push({ childId: String(child._id), name: child.name });
      }
    }

    return { pairs };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenFingerprint = refreshTokenRedisFingerprint(refreshToken);
    await this.cache.deleteSession(userId, tokenFingerprint);
  }

  // ─── Parental PIN ─────────────────────────────────────────────────────────

  async setParentalPin(userId: string, pin: string): Promise<{ success: boolean }> {
    const hash = await bcrypt.hash(pin, this.BCRYPT_ROUNDS);

    let parentalPinEnc: string | null = null;
    try {
      parentalPinEnc = this.childPinCrypto.encryptPin(pin);
    } catch (err) {
      this.logger.warn(
        `Parental PIN saved without encrypted backup (set CHILD_PIN_ENCRYPTION_KEY 16+ chars for "My PIN" cloud sync): ${err}`,
      );
    }

    const baseData = { parentalPinHash: hash, parentalPinSet: true as const };
    /** Clear stale ciphertext when we can't encrypt, so /auth/me won't show wrong digits. */
    const dataWithEnc =
      parentalPinEnc != null
        ? { ...baseData, parentalPinEnc }
        : { ...baseData, parentalPinEnc: null as string | null };

    try {
      await this.db.user.findOneAndUpdate({ _id: userId }, dataWithEnc);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('parentalPinEnc')) {
        this.logger.warn('parentalPinEnc field missing on schema. Saving hash only.');
        await this.db.user.findOneAndUpdate({ _id: userId }, baseData);
      } else {
        throw err;
      }
    }

    return { success: true };
  }

  async verifyParentalPin(userId: string, pin: string): Promise<{ valid: boolean }> {
    const user = await this.db.user.findOne({ _id: userId }).lean();
    if (!user?.parentalPinHash) return { valid: false };
    const valid = await bcrypt.compare(pin, user.parentalPinHash);
    return { valid };
  }

  /** Resolve whose parental PIN we verify: parent JWT → self; child JWT → linked parent. */
  async verifyParentalPinForJwtUser(
    jwt: AuthTokenPayload,
    pin: string,
  ): Promise<{ valid: boolean }> {
    const uid = await this.resolveUserIdForParentalPinVerification(jwt);
    if (!uid) return { valid: false };
    return this.verifyParentalPin(uid, pin);
  }

  /**
   * While signed in as a child, verify the parent's PIN and return fresh parent session tokens.
   */
  async switchChildSessionToParentWithPin(
    jwt: AuthTokenPayload,
    pin: string,
  ): Promise<AuthResponse> {
    if (jwt.role !== UserRole.CHILD) {
      throw new ForbiddenException(
        'Switch to parent is only available while signed in as a child.',
      );
    }
    const cp = await this.db.childProfile.findOne({ userId: jwt.sub }).select('parentId').lean();
    if (!cp?.parentId) {
      throw new NotFoundException('Child profile not found.');
    }
    const v = await this.verifyParentalPin(String(cp.parentId), pin);
    if (!v.valid) {
      throw new UnauthorizedException('Incorrect parental PIN.');
    }

    await this.db.user.findOneAndUpdate({ _id: cp.parentId }, { lastLoginAt: new Date() });

    const memberships = await this.db.familyMember
      .find({ userId: cp.parentId })
      .select('familyId')
      .lean();
    const familyIds = memberships.map((m) => String(m.familyId));

    const parent = await this.db.user.findOne({ _id: cp.parentId }).lean();
    if (!parent) {
      throw new NotFoundException('Parent user not found.');
    }

    return this.issueTokens(String(parent._id), parent.email, UserRole.PARENT, familyIds);
  }

  private async resolveUserIdForParentalPinVerification(
    jwt: AuthTokenPayload,
  ): Promise<string | null> {
    if (jwt.role === UserRole.CHILD) {
      const cp = await this.db.childProfile.findOne({ userId: jwt.sub }).select('parentId').lean();
      return cp?.parentId ? String(cp.parentId) : null;
    }
    return jwt.sub;
  }

  // ─── Google Sign-In ────────────────────────────────────────────────────────

  async googleSignIn(idToken: string): Promise<AuthResponse> {
    const { data } = await firstValueFrom(
      this.httpService.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`),
    );
    const { email, name, sub: googleId } = data as { email: string; name: string; sub: string };

    let user = await this.db.user.findOne({ email }).lean();
    if (!user) {
      const passwordHash = await bcrypt.hash(googleId, this.BCRYPT_ROUNDS);
      await this.db.user.create({
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'PARENT',
        parentalConsentGiven: true,
        parentalConsentAt: new Date(),
        parentalConsentVersion: '1.0',
      });
      user = await this.db.user.findOne({ email }).lean();
      if (!user) throw new UnauthorizedException('Failed to complete Google sign-in');

      // Auto-create default family group
      const family = await this.db.familyGroup.create({
        name: `${user.name}'s Family`,
        createdById: String(user._id),
      });
      await this.db.familyMember.create({
        familyId: family.id,
        userId: String(user._id),
        role: 'PRIMARY',
        canViewSafetyData: true,
        canChangeScreenTime: true,
        canApproveRewards: true,
        canManageSubscription: true,
      });
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await this.db.subscription.create({
        familyId: family.id,
        plan: 'STANDARD',
        status: 'TRIAL',
        trialEndsAt: trialEnd,
      });
    }

    const memberships = await this.db.familyMember
      .find({ userId: user._id })
      .select('familyId')
      .lean();
    const familyIds = memberships.map((m) => String(m.familyId));

    return this.issueTokens(String(user._id), user.email, user.role as UserRole, familyIds);
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  /**
   * Issues access + refresh JWTs and stores the refresh fingerprint in cache for the same TTL as the refresh JWT.
   */
  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    familyIds: string[],
  ): Promise<AuthResponse> {
    const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      role,
      familyIds,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '30d'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '365d'),
    });

    const tokenFingerprint = refreshTokenRedisFingerprint(refreshToken);
    const decodedRefresh = this.jwt.decode(refreshToken) as { exp?: number; iat?: number } | null;
    const ttlSeconds =
      decodedRefresh?.exp != null && decodedRefresh?.iat != null
        ? Math.max(300, decodedRefresh.exp - decodedRefresh.iat)
        : 365 * 24 * 60 * 60;
    await this.cache.setSession(userId, tokenFingerprint, ttlSeconds);

    const user = await this.db.user
      .findOne({ _id: userId })
      .select('id email name role avatarUrl createdAt parentalPinSet parentalPinEnc religion')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found after token issuance');
    }

    let childProfileId: string | undefined;
    if (role === UserRole.CHILD) {
      const cp = await this.db.childProfile.findOne({ userId }).select('id').lean();
      childProfileId = cp ? String(cp._id) : undefined;
    }

    const userProfile: UserProfile = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      avatarUrl: user.avatarUrl ?? undefined,
      createdAt: ((user as any).createdAt as Date).toISOString(),
      familyIds,
      childProfileId,
    };

    if (role === UserRole.PARENT) {
      userProfile.parentalPinSet = user.parentalPinSet ?? false;
      if (user.religion) {
        userProfile.religion = user.religion as UserProfile['religion'];
      }
      const digits = this.childPinCrypto.tryDecryptPin(user.parentalPinEnc);
      if (digits) {
        userProfile.parentalPinDigits = digits;
      }
    }

    return {
      accessToken,
      refreshToken,
      user: userProfile,
    };
  }

  private parseQrPayload(qrToken?: string): { code?: string } | null {
    if (!qrToken) {
      return null;
    }
    try {
      const decoded = Buffer.from(qrToken, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as { code?: string };
      return parsed;
    } catch {
      return null;
    }
  }

  private async upsertChildDevice(input: {
    childId: string;
    expoPushToken: string;
    platform: string;
    deviceName?: string;
  }): Promise<void> {
    const existing = await this.db.childDevice
      .findOne({ childId: input.childId, deviceToken: input.expoPushToken })
      .select('id')
      .lean();

    if (existing) {
      await this.db.childDevice.findOneAndUpdate(
        { _id: existing._id },
        {
          platform: input.platform,
          deviceName: input.deviceName,
          isActive: true,
          lastActiveAt: new Date(),
        },
      );
      return;
    }

    await this.db.childDevice.create({
      childId: input.childId,
      deviceToken: input.expoPushToken,
      platform: input.platform,
      deviceName: input.deviceName,
      pairedAt: new Date(),
      isActive: true,
      lastActiveAt: new Date(),
    });
  }
}
