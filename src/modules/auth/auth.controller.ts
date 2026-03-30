import { Controller, Post, Body, ForbiddenException, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login via Google SSO', description: 'Exchange a Google ID Token for TermHub Access & Refresh tokens.' })
  @ApiBody({ schema: { type: 'object', properties: { idToken: { type: 'string', example: 'google-id-token-here' } } } })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async loginSso(@Body('idToken') idToken: string) {
    return this.authService.validateGoogleSso(idToken);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Local Email/Password Login', description: 'Traditional login for administrative or emergency access.' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Local auth disabled)' })
  async loginLocal(@Body() body: LoginDto) {
    // Tech Lead architectural constraint: Gate local auth via env variable
    const isLocalAuthEnabled = this.configService.get<boolean>('enableLocalAuth');
    if (!isLocalAuthEnabled) {
      throw new ForbiddenException('Local authentication is completely disabled in this environment.');
    }
    
    return this.authService.validateLocalAuth(body.email, body.password);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate Tokens', description: 'Exchange a Refresh Token for a new pair of Access & Refresh tokens.' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  async refresh(@Request() req: any) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout', description: 'Invalidate current session and clear refresh token.' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.sub);
  }
}
