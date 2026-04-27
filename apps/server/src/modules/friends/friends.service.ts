import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthTokenPayload, UserRole } from '@parentingmykid/shared-types';
import { randomBytes } from 'crypto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  private makeCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async createInvite(user: AuthTokenPayload, fromChildId: string) {
    if (user.role !== UserRole.CHILD) throw new ForbiddenException();

    const child = await this.prisma.childProfile.findFirst({
      where: { id: fromChildId, userId: user.sub },
    });
    if (!child) throw new ForbiddenException('Not your child profile');

    const inviteCode = this.makeCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.friendInvite.create({
      data: {
        fromChildId: child.id,
        inviteCode,
        status: 'PENDING',
        expiresAt,
      },
    });

    return { inviteCode, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvite(user: AuthTokenPayload, inviteCode: string, toChildId: string) {
    if (user.role !== UserRole.CHILD) throw new ForbiddenException();

    await this.prisma.childProfile.findFirstOrThrow({
      where: { id: toChildId, userId: user.sub },
    });

    const inv = await this.prisma.friendInvite.findFirst({
      where: { inviteCode: inviteCode.toUpperCase(), status: 'PENDING' },
    });
    if (!inv || inv.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }
    if (inv.fromChildId === toChildId) {
      throw new BadRequestException('Cannot accept own invite');
    }

    const updated = await this.prisma.friendInvite.update({
      where: { id: inv.id },
      data: { toChildId, status: 'PENDING_PARENT' },
    });

    return { inviteId: updated.id, status: updated.status };
  }

  async parentApprove(
    user: AuthTokenPayload,
    familyId: string,
    inviteId: string,
    approve: boolean,
  ) {
    if (user.role !== UserRole.PARENT) throw new ForbiddenException();

    const m = await this.prisma.familyMember.findFirst({ where: { userId: user.sub, familyId } });
    if (!m) throw new ForbiddenException();

    const inv = await this.prisma.friendInvite.findUnique({
      where: { id: inviteId },
      include: { fromChild: true, toChild: true },
    });
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.status !== 'PENDING_PARENT') {
      throw new BadRequestException('Invite is not waiting for parent approval');
    }
    if (!inv.toChildId) throw new BadRequestException('Incomplete invite');

    const fromC = inv.fromChild;
    const toC = inv.toChild!;

    if (fromC.familyId !== familyId && toC.familyId !== familyId) {
      throw new ForbiddenException();
    }

    if (!approve) {
      await this.prisma.friendInvite.update({
        where: { id: inviteId },
        data: { status: 'REJECTED' },
      });
      return { status: 'REJECTED' as const };
    }

    const a = fromC.id < toC.id ? fromC.id : toC.id;
    const b = fromC.id < toC.id ? toC.id : fromC.id;

    await this.prisma.$transaction([
      this.prisma.friendInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED', parentApproved: true },
      }),
      this.prisma.childFriend.create({
        data: { childAId: a, childBId: b },
      }),
    ]);

    return { status: 'ACCEPTED' as const };
  }

  async listFriendsForChild(user: AuthTokenPayload, childId: string) {
    if (user.role !== UserRole.CHILD) throw new ForbiddenException();

    await this.prisma.childProfile.findFirstOrThrow({
      where: { id: childId, userId: user.sub },
    });

    const rels = await this.prisma.childFriend.findMany({
      where: { OR: [{ childAId: childId }, { childBId: childId }] },
      include: {
        childA: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        childB: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      },
    });

    return rels.map((r) => {
      const other = r.childAId === childId ? r.childB : r.childA;
      return { friend: other, since: r.since.toISOString() };
    });
  }

  async listPendingForFamily(user: AuthTokenPayload, familyId: string) {
    if (user.role !== UserRole.PARENT) throw new ForbiddenException();

    const m = await this.prisma.familyMember.findFirst({ where: { userId: user.sub, familyId } });
    if (!m) throw new ForbiddenException();

    const invs = await this.prisma.friendInvite.findMany({
      where: { status: 'PENDING_PARENT' },
      include: {
        fromChild: { select: { name: true, id: true, familyId: true } },
        toChild: { select: { name: true, id: true, familyId: true } },
      },
    });

    return invs
      .filter((i) => i.fromChild.familyId === familyId || i.toChild?.familyId === familyId)
      .map((i) => ({
        id: i.id,
        from: i.fromChild,
        to: i.toChild,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      }));
  }
}
