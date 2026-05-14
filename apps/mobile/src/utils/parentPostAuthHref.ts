import type { Href } from 'expo-router';
import type { UserProfile } from '@parentingmykid/shared-types';
import { UserRole } from '@parentingmykid/shared-types';
import { getRoleHomeHref } from './roleHomeHref';

/** Where authenticated parents should land: server parental PIN setup if needed, then Control Center. */
export function getParentPostAuthHref(user: UserProfile): Href {
  if (user.role !== UserRole.PARENT) {
    return (getRoleHomeHref(user.role) ?? '/auth') as Href;
  }
  if (user.parentalPinSet === false) {
    return '/auth/setup-parental-security-pin';
  }
  return '/(parent)/control-center';
}
