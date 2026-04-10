import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface RequestWithUser extends Request {
  user: { id: string; role: Role };
}

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR, Role.CMD, Role.LEADER, Role.AGENT, Role.SUPPORT)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get agent leaderboard with percentages for the current month' })
  async getLeaderboard(
    @Query() query: GetLeaderboardDto,
    @Request() req: RequestWithUser, 
  ) {
    return this.leaderboardService.getLeaderboard(query, req.user.role);
  }
}