/**
 * @module jwt-auth.guard.ts
 * @description Guard that protects routes with JWT authentication.
 *              Apply with @UseGuards(JwtAuthGuard) on any controller or route.
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
