/**
 * @module roles.decorator.ts
 * @description Custom decorator to specify which roles can access a route.
 *              Used together with RolesGuard.
 *
 * @example
 *   @Roles(UserRole.PARENT)          // Only parents can access
 *   @Roles(UserRole.PARENT, UserRole.ADMIN)  // Parents and admins
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@parentingmykid/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
