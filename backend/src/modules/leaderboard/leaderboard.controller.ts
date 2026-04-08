import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get agent leaderboard logic with percentages for the current month' })
  async getLeaderboard(@Query() query: GetLeaderboardDto) {
    return this.leaderboardService.getLeaderboard(
      query.startDate, 
      query.endDate,
      query.leaderId,
      query.email,
      query.name,
      query.leaderName,
    );
  }
}
