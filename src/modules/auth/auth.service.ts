import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

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

      // Ensure user exists in our DB (no self-registration allowed)
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('User not authorized in this system.');
      }

      // Block NEW_USER or Inactive users from getting JWT
      if (user.role === 'NEW_USER' || !user.isActive) {
        throw new UnauthorizedException('Your account is pending approval or has been deactivated.');
      }

      await this.usersService.logUserActivity(user.id, 'LOGGED_IN');
      
      const tokens = await this.getTokens(user.id, user.email, user.role);
      
      // Update activity and RT
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

  async validateLocalAuth(email: string, passwordHash: string) {
    const user = await this.usersService.findByEmail(email);
    // In a real environment, use bcrypt.compare here
    if (!user || user.passwordHash !== passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Block NEW_USER or Inactive users from getting JWT
    if (user.role === 'NEW_USER' || !user.isActive) {
      throw new UnauthorizedException('Your account is pending approval or has been deactivated.');
    }

    await this.usersService.logUserActivity(user.id, 'LOGGED_IN');
    
    const tokens = await this.getTokens(user.id, user.email, user.role);
    
    // Update activity and RT
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

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      hashedRefreshToken: hash,
    });
  }

  async refreshTokens(userId: string, rt: string) {
    const user = await this.usersService.findById(userId) as (User | null);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
    if (!rtMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    // Block NEW_USER or Inactive users from refreshing tokens
    if (user.role === 'NEW_USER' || !user.isActive) {
      throw new UnauthorizedException('Your account is pending approval or has been deactivated.');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    
    // Update activity and RT on refresh as well
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
