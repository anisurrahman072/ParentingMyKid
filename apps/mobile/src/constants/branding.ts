/**
 * App identity — display name and shared logo asset (1024×1024 PNG in /assets/brand).
 */

export const APP_DISPLAY_NAME = 'Parenting My Kid';

// Metro: from `src/constants/` → app root is `../..` → `assets/brand/`
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const LOGO_PNG = require('../../assets/brand/logo.png') as number;
