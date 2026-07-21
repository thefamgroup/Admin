import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, Public, RequirePermission } from '../../common/decorators/public.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: { email: string }) {
    await this.authService.forgotPassword(dto.email);
    return { ok: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: { token: string; password: string; invite?: boolean }) {
    if (dto.invite) {
      await this.authService.acceptInvite(dto.token, dto.password);
    } else {
      await this.authService.resetPassword(dto.token, dto.password);
    }
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  // TEMPORARY debug endpoints — remove after email is confirmed working
  @Public()
  @Get('debug-email')
  debugEmail() {
    return this.authService.debugSendEmail('admin@thefamgroup.uk');
  }

  @Public()
  @Get('debug-reset')
  debugReset() {
    return this.authService.forgotPasswordDebug('admin@thefamgroup.uk');
  }

  // ── User management ──────────────────────────────────────────────

  @Get('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all admin users' })
  listUsers() {
    return this.authService.listUsers();
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a new admin user' })
  inviteUser(@Body() dto: { email: string; firstName: string; lastName: string; role: UserRole; permissions: string[] }) {
    return this.authService.inviteUser(dto);
  }

  @Patch('users/:id/permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a user's permissions and role" })
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { permissions: string[]; role?: UserRole },
  ) {
    return this.authService.updateUserPermissions(id, dto.permissions, dto.role);
  }

  @Patch('users/:id/active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { isActive: boolean },
  ) {
    return this.authService.toggleUserActive(id, dto.isActive);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() me: any) {
    return this.authService.deleteUser(id, me.sub);
  }
}
