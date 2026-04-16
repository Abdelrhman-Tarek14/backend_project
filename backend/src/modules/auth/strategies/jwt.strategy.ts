import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    // Return the LATEST data from the database, not what is stale in the JWT.
    // NOTE: We intentionally do NOT throw for inactive users here.
    // The frontend ProtectedRoute reads `isActive` and shows <RestrictedPage /> for them.
    // Throwing 401 here would cause AuthContext to set user=null → redirect to login instead.
    return { id: user.id, email: user.email, role: user.role, isActive: user.isActive, name: user.name };
  }
}
