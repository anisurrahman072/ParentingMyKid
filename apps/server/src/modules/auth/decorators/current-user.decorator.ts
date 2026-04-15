/**
 * @module current-user.decorator.ts
 * @description Extracts the current authenticated user from the request.
 *              Use in controller parameters to get the logged-in user without
 *              manually accessing request.user every time.
 *
 * @example
 *   async getProfile(@CurrentUser() user: AuthTokenPayload) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from '@parentingmykid/shared-types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthTokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthTokenPayload;
  },
);
