/**
 * @module jwt.strategy.ts
 * @description Passport JWT strategy for validating Bearer tokens on protected routes.
 *              Extracts and verifies the JWT from the Authorization header.
 *              On success, attaches the decoded payload to request.user.
 *
 * @business-rule We use custom JWT (not Firebase Auth) because:
 *   1. We need full control over token claims (familyIds, role, childId)
 *   2. Firebase Auth cannot support parental consent flows
 *   3. PIN-based child login requires custom session management
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenPayload } from '@parentingmykid/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called by Passport after token signature is verified.
   * Return value becomes request.user in controllers.
   */
  async validate(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
