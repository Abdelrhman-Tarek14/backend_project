import { Controller, Post, Get, Body, ForbiddenException, HttpCode, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user: { sub: string; email: string; role: string; refreshToken: string };
}

@ApiTags('Auth')
@Throttle({ default: { limit: 5, ttl: 180000 } }) // 5 attempts per 3 minutes
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Post('sso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login via Google SSO', description: 'Exchange a Google ID Token for TermHub access/refresh tokens. [Rate Limit: 5 attempts / 3 mins]' })
  @ApiBody({ schema: { type: 'object', properties: { idToken: { type: 'string', example: 'google-id-token-here' } } } })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async loginSso(
    @Body('idToken') idToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.validateGoogleSso(idToken);
    this.setCookies(res, tokens);
    return { message: 'Successfully authenticated' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2', description: 'Redirects the user to Google for authentication.' })
  async googleAuth(@Request() req: any) {
    // Passport handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 Callback', description: 'Receives the profile from Google, sets HTTP-only cookies, and redirects to the frontend.' })
  async googleAuthRedirect(
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
        const tokens = await this.authService.validateGoogleUser(req.user);
        this.setCookies(res, tokens);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        return res.redirect(frontendUrl);
    } catch (error) {
        console.error('[AuthController] Google Auth Error:', error);
        // Redirect to login with error param if something fails
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Local Email/Password Login', description: 'Traditional login for administrative access. [Rate Limit: 5 attempts / 3 mins]' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Local auth disabled)' })
  async loginLocal(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isLocalAuthEnabled = this.configService.get<boolean>('enableLocalAuth');
    if (!isLocalAuthEnabled) {
      throw new ForbiddenException('Local authentication is completely disabled in this environment.');
    }

    const tokens = await this.authService.validateLocalAuth(body.email, body.password);
    this.setCookies(res, tokens);
    return { message: 'Successfully authenticated' };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate Tokens', description: 'Exchange a Refresh Token for a new pair of Access & Refresh tokens.' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  async refresh(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    this.setCookies(res, tokens);
    return { message: 'Tokens rotated successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout', description: 'Invalidate current session and clear refresh token.' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.sub);
    const cookieOptions = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
    };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return { message: 'Logout successful' };
  }

  private setCookies(res: Response, tokens: { access_token: string; refresh_token: string }) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 1 * 60 * 60 * 1000, // 1 hour
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
}
