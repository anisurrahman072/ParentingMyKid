import { FamilyMemberRole, FamilyMemberSummary } from '@parentingmykid/shared-types';

/**
 * How this roster entry reads relative to the signed-in parent (“you”).
 */
export function formatMemberRelation(
  member: FamilyMemberSummary,
  currentUserId: string,
): { title: string; relationLine: string } {
  const isSelf = member.userId === currentUserId;
  if (isSelf) {
    return {
      title: member.name,
      relationLine: `You · ${roleNounLong(member.role, true)}`,
    };
  }
  return {
    title: member.name,
    relationLine: `· ${roleNounLong(member.role, false)}`,
  };
}

function roleNounLong(role: FamilyMemberRole, toSelf: boolean): string {
  switch (role) {
    case FamilyMemberRole.PRIMARY:
      return toSelf ? 'primary parent' : 'primary parent in this home';
    case FamilyMemberRole.CO_PARENT:
      return toSelf ? 'co-parent' : 'co-parent';
    case FamilyMemberRole.GUARDIAN:
      return toSelf ? 'guardian' : 'guardian';
    case FamilyMemberRole.TUTOR:
      return toSelf ? 'tutor' : 'tutor';
    default:
      return 'member';
  }
}

export function formatChildRelationLine(): string {
  return '· Child in this family';
}

/** Label for the signed-in user’s own role in this household (e.g. settings line). */
export function formatMyRoleInFamily(role: FamilyMemberRole): string {
  switch (role) {
    case FamilyMemberRole.PRIMARY:
      return 'Primary parent';
    case FamilyMemberRole.CO_PARENT:
      return 'Co-parent';
    case FamilyMemberRole.GUARDIAN:
      return 'Guardian';
    case FamilyMemberRole.TUTOR:
      return 'Tutor';
    default:
      return 'Member';
  }
}
