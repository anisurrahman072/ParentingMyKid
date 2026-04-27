/**
 * Build rgba() from a #RRGGBB token for translucent icon halos (avoids invalid 8-digit hex on all platforms).
 */
export function colorWithAlpha(hex: string, alpha: number): string {
  if (hex.length === 7 && hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}
