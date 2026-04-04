import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    );
  }

  async validateGoogleSso(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google payload');
      }
      const email = payload.email;

      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('User not authorized in this system.');
      }

      if (user.role === Role.NEW_USER || !user.isActive) {
        throw new UnauthorizedException('Your account is pending approval or has been deactivated.');
      }

      await this.usersService.logUserActivity(user.id, 'LOGGED_IN');

      const tokens = await this.getTokens(user.id, user.email, user.role);

      await this.usersService.update(user.id, {
        isOnline: true,
        lastActive: new Date(),
        hashedRefreshToken: await bcrypt.hash(tokens.refresh_token, 10),
      });

      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Invalid Google Token');
    }
  }

  async validateLocalAuth(email: string, passwordPlain: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === Role.NEW_USER || !user.isActive) {
      throw new UnauthorizedException('Your account is pending approval or has been deactivated.');
    }

    await this.usersService.logUserActivity(user.id, 'LOGGED_IN');

    const tokens = await this.getTokens(user.id, user.email, user.role);

    await this.usersService.update(user.id, {
      isOnline: true,
      lastActive: new Date(),
      hashedRefreshToken: await bcrypt.hash(tokens.refresh_token, 10),
    });

    return tokens;
  }

  async getTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any,
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
    if (!rtMatches) {
      // TOKEN REUSE DETECTION
      // If a user sends a valid RT that doesn't match the one in the database, 
      // it means this token has likely been used before or stolen.
      // For safety, we invalidate all sessions by clearing the stored token.
      await this.usersService.update(userId, { hashedRefreshToken: null });
      await this.usersService.logUserActivity(userId, 'TOKEN_REUSE_DETECTED');
      throw new UnauthorizedException('Access Denied - Potential reuse detected');
    }

    if (user.role === Role.NEW_USER || !user.isActive) {
      throw new UnauthorizedException('Your account is pending approval or has been deactivated.');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);

    await this.usersService.update(user.id, {
      lastActive: new Date(),
      hashedRefreshToken: await bcrypt.hash(tokens.refresh_token, 10),
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.update(userId, {
      isOnline: false,
      hashedRefreshToken: null,
    });
    await this.usersService.logUserActivity(userId, 'LOGGED_OUT');
  }
}