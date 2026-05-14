import { BadRequestException, Injectable } from '@nestjs/common';
import { FamilyMemberRole, MyFamilyListItem, FamilyMemberSummary } from '@parentingmykid/shared-types';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class FamiliesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create another household for this parent. They are PRIMARY; initial subscription is FREE/ACTIVE
   * (the first family from sign-up may still be on trial — billing can be per-family later).
   */
  async createMyFamily(userId: string, rawName: string): Promise<MyFamilyListItem> {
    const name = rawName.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const family = await this.db.familyGroup.create({ name, createdById: userId });
    await this.db.familyMember.create({
      familyId: family._id,
      userId,
      role: 'PRIMARY',
      canViewSafetyData: true,
      canChangeScreenTime: true,
      canApproveRewards: true,
      canManageSubscription: true,
    });
    await this.db.subscription.create({
      familyId: family._id,
      plan: 'FREE',
      status: 'ACTIVE',
    });

    const list = await this.listMyFamilies(userId);
    const created = list.find((f) => f.id === (family._id as string));
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
    const memberships = await this.db.familyMember
      .find({ userId })
      .sort({ joinedAt: 1 })
      .lean();

    if (memberships.length === 0) return [];

    const familyIds = memberships.map((m) => m.familyId);

    const [families, allMembers, allChildren] = await Promise.all([
      this.db.familyGroup.find({ _id: { $in: familyIds } }).lean(),
      this.db.familyMember.find({ familyId: { $in: familyIds } }).lean(),
      this.db.childProfile
        .find({ familyId: { $in: familyIds } })
        .select('_id name familyId')
        .lean(),
    ]);

    const memberUserIds = [...new Set(allMembers.map((m) => m.userId))];
    const users = await this.db.user
      .find({ _id: { $in: memberUserIds } })
      .select('_id name avatarUrl')
      .lean();

    const familyMap = new Map(families.map((f) => [f._id as string, f]));
    const userMap = new Map(users.map((u) => [u._id as string, u]));

    const membersByFamily = new Map<string, typeof allMembers>();
    for (const m of allMembers) {
      const list = membersByFamily.get(m.familyId) ?? [];
      list.push(m);
      membersByFamily.set(m.familyId, list);
    }

    const childrenByFamily = new Map<string, typeof allChildren>();
    for (const c of allChildren) {
      const list = childrenByFamily.get(c.familyId) ?? [];
      list.push(c);
      childrenByFamily.set(c.familyId, list);
    }

    const order: Record<FamilyMemberRole, number> = {
      [FamilyMemberRole.PRIMARY]: 0,
      [FamilyMemberRole.CO_PARENT]: 1,
      [FamilyMemberRole.GUARDIAN]: 2,
      [FamilyMemberRole.TUTOR]: 3,
    };

    return memberships.map((m) => {
      const fam = familyMap.get(m.familyId);
      const rawMembers = membersByFamily.get(m.familyId) ?? [];
      const rawChildren = childrenByFamily.get(m.familyId) ?? [];

      const members: FamilyMemberSummary[] = rawMembers
        .map((fm) => {
          const user = userMap.get(fm.userId);
          return {
            userId: fm.userId,
            name: user?.name ?? '',
            role: fm.role as FamilyMemberRole,
            avatarUrl: user?.avatarUrl ?? undefined,
          };
        })
        .sort((a, b) => {
          const d = order[a.role] - order[b.role];
          if (d !== 0) return d;
          return a.name.localeCompare(b.name);
        });

      return {
        id: (fam?._id ?? m.familyId) as string,
        name: fam?.name ?? '',
        myRole: m.role as FamilyMemberRole,
        members,
        children: rawChildren.map((c) => ({ id: c._id as string, name: c.name })),
      };
    });
  }
}
