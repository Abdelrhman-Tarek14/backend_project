import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class AuthService {


  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async validateGoogleUser(googleUser: any) {
    const { email, googleId, firstName, lastName, picture } = googleUser;
    console.log(`[AuthService] Attempting Google Auth for: ${email} (ID: ${googleId})`);
    
    // 1. Find user by googleId or email
    let user = await this.usersService.findByGoogleId(googleId);
    if (!user) {
      console.log(`[AuthService] User not found by GoogleId, checking email...`);
      user = await this.usersService.findByEmail(email);
    }

    // 2. Auto-register if not found
    if (!user) {
      const allowedDomains = this.configService.get<string[]>('allowedGoogleDomains') || [];
      const userDomain = email.split('@')[1]?.toLowerCase();

      if (allowedDomains.length > 0 && !allowedDomains.includes(userDomain)) {
        console.warn(`[AuthService] Registration blocked: Domain ${userDomain} is not in the allowlist.`);
        throw new UnauthorizedException(`Registration is restricted to authorized domains only (${allowedDomains.join(', ')}).`);
      }

      console.log(`[AuthService] No user found by GoogleId or email. Creating new account...`);
      user = await this.usersService.create({
        email,
        name: `${firstName} ${lastName}`,
        googleId,
        pictureUrl: picture,
        role: Role.NEW_USER,
        isActive: false, // Default to inactive for new Google users
      });
      console.log(`[AuthService] Created new user: ${user.id}`);
    } else {
      console.log(`[AuthService] Found existing user: ${user.id} (isActive: ${user.isActive})`);
    }

    // Double check to satisfy TypeScript null safety
    if (!user) {
        throw new UnauthorizedException('Authentication failed: user could not be found or created.');
    }

    // 3. Enforce activation check
    if (!user.isActive) {
      console.warn(`[AuthService] Access denied for inactive user: ${user.email}`);
      throw new UnauthorizedException('Your account is pending activation. Please contact your administrator.');
    }

    // 4. Update core identity data if it changed
    await this.usersService.update(user.id, {
      googleId,
      pictureUrl: picture,
      name: `${firstName} ${lastName}`,
      isOnline: true,
      lastActive: new Date(),
    });

    await this.usersService.logUserActivity(user.id, 'LOGGED_IN_GOOGLE');

    const tokens = await this.getTokens(user.id, user.email, user.role);

    // 5. Update refresh token with latest
    await this.usersService.update(user.id, {
      hashedRefreshToken: await bcrypt.hash(tokens.refresh_token, 10),
    });

    return tokens;
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