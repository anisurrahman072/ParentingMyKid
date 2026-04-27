/**
 * When an assignee has no `avatarUrl`, pick a stable, distinct background + letter color
 * per person (`kind` + `id`) so chips don't all look identical.
 */
export type AssigneeFallbackAvatarColors = {
  backgroundColor: string;
  letterColor: string;
};

const PALETTE: AssigneeFallbackAvatarColors[] = [
  { backgroundColor: 'rgba(120, 53, 15, 0.28)', letterColor: '#5c2d0c' },
  { backgroundColor: 'rgba(22, 101, 52, 0.26)', letterColor: '#14532d' },
  { backgroundColor: 'rgba(30, 64, 175, 0.24)', letterColor: '#1e3a8a' },
  { backgroundColor: 'rgba(154, 52, 18, 0.24)', letterColor: '#7c2d12' },
  { backgroundColor: 'rgba(107, 33, 168, 0.22)', letterColor: '#581c87' },
  { backgroundColor: 'rgba(4, 120, 87, 0.24)', letterColor: '#065f46' },
  { backgroundColor: 'rgba(180, 83, 9, 0.24)', letterColor: '#92400e' },
  { backgroundColor: 'rgba(190, 24, 93, 0.2)', letterColor: '#9d174d' },
  { backgroundColor: 'rgba(21, 94, 117, 0.24)', letterColor: '#164e63' },
  { backgroundColor: 'rgba(76, 29, 149, 0.22)', letterColor: '#4c1d95' },
  { backgroundColor: 'rgba(113, 63, 18, 0.26)', letterColor: '#713f12' },
  { backgroundColor: 'rgba(21, 128, 61, 0.24)', letterColor: '#166534' },
];

function hashStable(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function assigneeFallbackAvatarColors(assigneeKey: string): AssigneeFallbackAvatarColors {
  const idx = hashStable(assigneeKey) % PALETTE.length;
  return PALETTE[idx]!;
}
