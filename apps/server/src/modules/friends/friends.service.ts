import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuthTokenPayload, UserRole } from '@parentingmykid/shared-types';
import { randomBytes } from 'crypto';

@Injectable()
export class FriendsService {
  constructor(private readonly db: DatabaseService) {}

  private makeCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async createInvite(user: AuthTokenPayload, fromChildId: string) {
    if (user.role !== UserRole.CHILD) throw new ForbiddenException();

    const child = await this.db.childProfile.findOne({ _id: fromChildId, userId: user.sub }).lean();
    if (!child) throw new ForbiddenException('Not your child profile');

    const inviteCode = this.makeCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.db.friendInvite.create({
      fromChildId: String(child._id),
      inviteCode,
      status: 'PENDING',
      expiresAt,
    });

    return { inviteCode, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvite(user: AuthTokenPayload, inviteCode: string, toChildId: string) {
    if (user.role !== UserRole.CHILD) throw new ForbiddenException();

    const toChild = await this.db.childProfile.findOne({ _id: toChildId, userId: user.sub }).lean();
    if (!toChild) throw new NotFoundException('Child profile not found or not yours');

    const inv = await this.db.friendInvite
      .findOne({ inviteCode: inviteCode.toUpperCase(), status: 'PENDING' })
      .lean();
    if (!inv || inv.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }
    if (inv.fromChildId === toChildId) {
      throw new BadRequestException('Cannot accept own invite');
    }

    const updated = await this.db.friendInvite
      .findByIdAndUpdate(inv._id, { toChildId, status: 'PENDING_PARENT' }, { new: true })
      .lean();

    return { inviteId: String(updated!._id), status: updated!.status };
  }

  async parentApprove(
    user: AuthTokenPayload,
    familyId: string,
    inviteId: string,
    approve: boolean,
  ) {
    if (user.role !== UserRole.PARENT) throw new ForbiddenException();

    const m = await this.db.familyMember.findOne({ userId: user.sub, familyId }).lean();
    if (!m) throw new ForbiddenException();

    const inv = await this.db.friendInvite.findById(inviteId).lean();
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.status !== 'PENDING_PARENT') {
      throw new BadRequestException('Invite is not waiting for parent approval');
    }
    if (!inv.toChildId) throw new BadRequestException('Incomplete invite');

    const [fromC, toC] = await Promise.all([
      this.db.childProfile.findById(inv.fromChildId).lean(),
      this.db.childProfile.findById(inv.toChildId).lean(),
    ]);
    if (!fromC || !toC) throw new NotFoundException('Child profile not found');

    if (fromC.familyId !== familyId && toC.familyId !== familyId) {
      throw new ForbiddenException();
    }

    if (!approve) {
      await this.db.friendInvite.findByIdAndUpdate(inviteId, { status: 'REJECTED' });
      return { status: 'REJECTED' as const };
    }

    const a = String(fromC._id) < String(toC._id) ? String(fromC._id) : String(toC._id);
    const b = String(fromC._id) < String(toC._id) ? String(toC._id) : String(fromC._id);

    await Promise.all([
      this.db.friendInvite.findByIdAndUpdate(inviteId, { status: 'ACCEPTED', parentApproved: true }),
      this.db.childFriend.create({ childAId: a, childBId: b }),
    ]);

    return { status: 'ACCEPTED' as const };
  }

  async listFriendsForChild(user: AuthTokenPayload, childId: string) {
    if (user.role !== UserRole.CHILD) throw new ForbiddenException();

    const own = await this.db.childProfile.findOne({ _id: childId, userId: user.sub }).lean();
    if (!own) throw new NotFoundException('Child profile not found or not yours');

    const rels = await this.db.childFriend
      .find({ $or: [{ childAId: childId }, { childBId: childId }] })
      .lean();

    const otherIds = rels.map((r) => (r.childAId === childId ? r.childBId : r.childAId));
    const profiles = await this.db.childProfile
      .find({ _id: { $in: otherIds } })
      .select('_id name nickname avatarUrl')
      .lean();
    const profileMap = new Map(profiles.map((p) => [String(p._id), p]));

    return rels.map((r) => {
      const otherId = r.childAId === childId ? r.childBId : r.childAId;
      const other = profileMap.get(otherId);
      return { friend: other ? { id: String(other._id), name: other.name, nickname: other.nickname, avatarUrl: other.avatarUrl } : null, since: r.since.toISOString() };
    }).filter((r) => r.friend !== null);
  }

  async listPendingForFamily(user: AuthTokenPayload, familyId: string) {
    if (user.role !== UserRole.PARENT) throw new ForbiddenException();

    const m = await this.db.familyMember.findOne({ userId: user.sub, familyId }).lean();
    if (!m) throw new ForbiddenException();

    const invs = await this.db.friendInvite.find({ status: 'PENDING_PARENT' }).lean();

    const childIds = [...new Set(invs.flatMap((i) => [i.fromChildId, i.toChildId].filter(Boolean) as string[]))];
    const profiles = await this.db.childProfile
      .find({ _id: { $in: childIds } })
      .select('_id name familyId')
      .lean();
    const profileMap = new Map(profiles.map((p) => [String(p._id), p]));

    return invs
      .map((i) => {
        const fromChild = profileMap.get(i.fromChildId);
        const toChild = i.toChildId ? profileMap.get(i.toChildId) : undefined;
        return { inv: i, fromChild, toChild };
      })
      .filter(({ fromChild, toChild }) =>
        fromChild?.familyId === familyId || toChild?.familyId === familyId,
      )
      .map(({ inv, fromChild, toChild }) => ({
        id: String(inv._id),
        from: fromChild ? { id: String(fromChild._id), name: fromChild.name, familyId: fromChild.familyId } : null,
        to: toChild ? { id: String(toChild._id), name: toChild.name, familyId: toChild.familyId } : null,
        status: inv.status,
        createdAt: (inv as unknown as { createdAt: Date }).createdAt.toISOString(),
      }));
  }
}
