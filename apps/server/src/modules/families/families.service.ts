import { BadRequestException, Injectable } from '@nestjs/common';
import { FamilyMemberRole, MyFamilyListItem, FamilyMemberSummary } from '@parentingmykid/shared-types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create another household for this parent. They are PRIMARY; initial subscription is FREE/ACTIVE
   * (the first family from sign-up may still be on trial — billing can be per-family later).
   */
  async createMyFamily(userId: string, rawName: string): Promise<MyFamilyListItem> {
    const name = rawName.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const { id: newFamilyId } = await this.prisma.$transaction(async (tx) => {
      const family = await tx.familyGroup.create({
        data: { name, createdById: userId },
      });
      await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId: userId,
          role: 'PRIMARY',
          canViewSafetyData: true,
          canChangeScreenTime: true,
          canApproveRewards: true,
          canManageSubscription: true,
        },
      });
      await tx.subscription.create({
        data: {
          familyId: family.id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });
      return family;
    });

    const list = await this.listMyFamilies(userId);
    const created = list.find((f) => f.id === newFamilyId);
    if (!created) {
      throw new BadRequestException('Failed to load new household');
    }
    return created;
  }

  /**
   * All households the parent belongs to (e.g. primary in one, co-parent in another)
   * with full member rosters and child names for the family space UI.
   */
  async listMyFamilies(userId: string): Promise<MyFamilyListItem[]> {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
            children: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => {
      const fam = m.family;
      const members: FamilyMemberSummary[] = fam.members.map((fm) => ({
        userId: fm.userId,
        name: fm.user.name,
        role: fm.role as FamilyMemberRole,
        avatarUrl: fm.user.avatarUrl ?? undefined,
      }));
      const order: Record<FamilyMemberRole, number> = {
        [FamilyMemberRole.PRIMARY]: 0,
        [FamilyMemberRole.CO_PARENT]: 1,
        [FamilyMemberRole.GUARDIAN]: 2,
        [FamilyMemberRole.TUTOR]: 3,
      };
      members.sort((a, b) => {
        const d = order[a.role] - order[b.role];
        if (d !== 0) return d;
        return a.name.localeCompare(b.name);
      });

      return {
        id: fam.id,
        name: fam.name,
        myRole: m.role as FamilyMemberRole,
        members,
        children: fam.children.map((c) => ({ id: c.id, name: c.name })),
      };
    });
  }
}
