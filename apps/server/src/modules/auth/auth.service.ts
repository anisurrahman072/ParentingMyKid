/**
 * @module auth.service.ts
 * @description Core authentication service — handles all auth flows:
 *   1. Parent registration with parental consent
 *   2. Parent/guardian login with JWT issue
 *   3. Child PIN login (age-appropriate, no email required)
 *   4. Refresh token rotation (Redis-backed)
 *   5. Device pairing via 6-digit code or QR
 *
 * @business-rule Security is critical in a children's app:
 *   - All passwords and PINs are bcrypt-hashed (never stored raw)
 *   - Access tokens are short-lived (15 minutes)
 *   - Refresh tokens are rotated on each use (prevent token theft)
 *   - Pairing codes expire in 5 minutes
 *   - Parental consent is required and stored for legal compliance (COPPA)
 *
 * @note Refresh sessions in Redis use SHA-256(refreshToken) as the key suffix.
 *       bcrypt.hash() is unsuitable here: each call yields a different salt/hash,
 *       so lookup on refresh would never match the stored session.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  RegisterParentDto,
  LoginDto,
  ChildPinLoginDto,
  ConfirmPairingDto,
  SetChildPinDto,
} from './dto/register.dto';
import {
  UserRole,
  AuthTokenPayload,
  AuthResponse,
  PairingCodeResponse,
  UserProfile,
} from '@parentingmykid/shared-types';

/** Stable Redis session key suffix for a refresh JWT (bcrypt is non-deterministic per call). */
function refreshTokenRedisFingerprint(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12; // Higher than standard 10 — children's data is sensitive

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Create user and default family group in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          phone: dto.phone,
          role: UserRole.PARENT,
          parentalConsentGiven: true,
          parentalConsentAt: new Date(),
          parentalConsentVersion: '1.0',
          languagePreference: dto.languagePreference ?? 'en',
        },
      });

      // Auto-create default family group named after the parent
      const family = await tx.familyGroup.create({
        data: {
          name: `${dto.name}'s Family`,
          createdById: user.id,
        },
      });

      // Add user as PRIMARY parent of the family
      await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId: user.id,
          role: 'PRIMARY',
          canViewSafetyData: true,
          canChangeScreenTime: true,
          canApproveRewards: true,
          canManageSubscription: true,
        },
      });

      // Start 14-day free trial automatically
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await tx.subscription.create({
        data: {
          familyId: family.id,
          plan: 'STANDARD',
          status: 'TRIAL',
          trialEndsAt: trialEnd,
        },
      });

      // Log the trial start event
      const subscription = await tx.subscription.findUniqueOrThrow({
        where: { familyId: family.id },
      });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          eventType: 'TRIAL_STARTED',
          plan: 'STANDARD',
        },
      });

      return { user, family };
    });

    this.logger.log(`New parent registered: ${result.user.email}`);

    return this.issueTokens(result.user.id, result.user.email, UserRole.PARENT, [result.family.id]);
  }

  // ─── Parent Login ──────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponse> {
    console.log('login', dto);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || user.role === UserRole.CHILD) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get all family IDs this user belongs to
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId: user.id },
      select: { familyId: true },
    });
    const familyIds = memberships.map((m) => m.familyId);

    return this.issueTokens(user.id, user.email, user.role as UserRole, familyIds);
  }

  // ─── Child PIN Login ───────────────────────────────────────────────────────

  /**
   * Allows a child to log in using their 4-digit PIN.
   * Child accounts use PIN instead of email/password — age-appropriate and friction-free.
   */
  async childPinLogin(dto: ChildPinLoginDto): Promise<AuthResponse> {
    const child = await this.prisma.childProfile.findUnique({
      where: { id: dto.childId },
      include: { user: true },
    });

    if (!child || !child.pinHash) {
      throw new UnauthorizedException('Child profile not found or PIN not set');
    }

    const isPinValid = await bcrypt.compare(dto.pin, child.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('Incorrect PIN. Please try again.');
    }

    return this.issueTokens(child.userId, child.user.email, UserRole.CHILD, [child.familyId]);
  }

  // ─── Set Child PIN ─────────────────────────────────────────────────────────

  /**
   * Parent sets or updates the 4-digit PIN for their child's account.
   * Called during onboarding and from parent settings.
   */
  async setChildPin(parentId: string, childId: string, dto: SetChildPinDto): Promise<void> {
    const child = await this.prisma.childProfile.findFirst({
      where: { id: childId, parentId },
    });

    if (!child) {
      throw new ForbiddenException('Child not found or access denied');
    }

    const pinHash = await bcrypt.hash(dto.pin, this.BCRYPT_ROUNDS);
    await this.prisma.childProfile.update({
      where: { id: childId },
      data: { pinHash },
    });
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
    const exists = await this.redis.sessionExists(payload.sub, tokenFingerprint);
    if (!exists) {
      // Token has already been used or revoked — possible theft attempt
      await this.redis.revokeAllSessions(payload.sub);
      throw new UnauthorizedException('Refresh token already used. Please log in again.');
    }

    // Revoke old refresh token
    await this.redis.deleteSession(payload.sub, tokenFingerprint);

    // Issue new token pair
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId: payload.sub },
      select: { familyId: true },
    });
    const familyIds = memberships.map((m) => m.familyId);

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
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        phone: true,
      },
    });

    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });
    const familyIds = memberships.map((m) => m.familyId);

    let childProfileId: string | undefined;
    if (role === UserRole.CHILD) {
      const cp = await this.prisma.childProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      childProfileId = cp?.id;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      avatarUrl: user.avatarUrl ?? undefined,
      phone: user.phone ?? undefined,
      createdAt: user.createdAt.toISOString(),
      familyIds,
      childProfileId,
    };
  }

  // ─── Device Pairing ────────────────────────────────────────────────────────

  /**
   * Generates a 6-digit pairing code shown on the parent's screen.
   * The parent shows this (or the QR code) to their child's device to link it.
   * Code expires in 5 minutes via Redis TTL.
   */
  async generatePairingCode(parentId: string): Promise<PairingCodeResponse> {
    // Generate cryptographically random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await this.redis.setPairingCode(code, parentId);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Generate QR code that encodes {code, parentId, appScheme}
    const qrData = Buffer.from(JSON.stringify({ code, parentId })).toString('base64');
    const qrImage = await QRCode.toDataURL(qrData);

    return { code, expiresAt, qrData: qrImage };
  }

  /**
   * Confirms device pairing — child's device submits the code + their childId.
   * On success, creates a ChildDevice record and issues child JWT.
   */
  async confirmDevicePairing(dto: ConfirmPairingDto): Promise<AuthResponse> {
    const parentId = await this.redis.getPairingCode(dto.code);

    if (!parentId) {
      throw new BadRequestException(
        'Pairing code is invalid or has expired. Please generate a new code.',
      );
    }

    // Verify the child belongs to this parent
    const child = await this.prisma.childProfile.findFirst({
      where: { id: dto.childId, parentId },
    });

    if (!child) {
      throw new ForbiddenException('Child profile not found for this parent');
    }

    // Register the paired device
    await this.prisma.childDevice.create({
      data: {
        childId: dto.childId,
        deviceToken: dto.expoPushToken,
        platform: dto.platform,
        deviceName: dto.deviceName,
        pairedAt: new Date(),
        isActive: true,
      },
    });

    // Invalidate the pairing code — one-time use only
    await this.redis.deletePairingCode(dto.code);

    return this.issueTokens(child.userId, '', UserRole.CHILD, [child.familyId]);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenFingerprint = refreshTokenRedisFingerprint(refreshToken);
    await this.redis.deleteSession(userId, tokenFingerprint);
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  /**
   * Issues both access token (15 min) and refresh token (7 days).
   * Stores refresh token hash in Redis for rotation/revocation.
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
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token fingerprint in Redis (7 day TTL)
    const tokenFingerprint = refreshTokenRedisFingerprint(refreshToken);
    await this.redis.setSession(userId, tokenFingerprint, 7 * 24 * 60 * 60);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    let childProfileId: string | undefined;
    if (role === UserRole.CHILD) {
      const cp = await this.prisma.childProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      childProfileId = cp?.id;
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        avatarUrl: user.avatarUrl ?? undefined,
        createdAt: user.createdAt.toISOString(),
        familyIds,
        childProfileId,
      },
    };
  }
}
