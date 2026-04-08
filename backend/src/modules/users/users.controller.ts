import { Controller, Get, Patch, Body, Param, UseGuards, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserEntity } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get Current Profile', description: 'Retrieve the profile of the currently authenticated user.' })
  @ApiResponse({ status: 200, description: 'Return user profile' })
  async getProfile(@CurrentUser() user: any) {
    const userProfile = await this.usersService.findById(user.id);
    return userProfile;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update Current Profile', description: 'Update display name, appearance, and theme preferences.' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateUserProfileDto) {
    await this.usersService.update(user.id, dto);
    const updatedUser = await this.usersService.findById(user.id);
    return new UserEntity(updatedUser!);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_USER, Role.SUPERVISOR, Role.CMD, Role.LEADER)
  @ApiOperation({ summary: 'List Users (Rank-Filtered)', description: 'Paginated list of users visible to your role.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Return paginated users' })
  @ApiResponse({ status: 403, description: 'Forbidden - AGENT and SUPPORT have no access' })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.findAll(page, limit, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Update User Status', description: 'Update a user\'s role or active status based on hierarchical permissions.' })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or self-modification' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateStatus(id, dto, {
      sub: user.id,
      role: user.role
    });
  }
}