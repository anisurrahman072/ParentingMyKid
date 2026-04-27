import type { Href } from 'expo-router';
import { UserRole } from '@parentingmykid/shared-types';

export function getRoleHomeHref(role: UserRole): Href | null {
  switch (role) {
    case UserRole.PARENT:
      return '/(parent)/dashboard';
    case UserRole.CHILD:
      return '/(child)/missions';
    case UserRole.TUTOR:
      return '/(tutor)/portal';
    default:
      return null;
  }
}
