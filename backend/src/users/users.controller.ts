import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permission.ASSIGN_ROLES)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create(actor, dto);
  }

  @Get()
  @RequirePermissions(Permission.ASSIGN_ROLES)
  findAll(@CurrentUser() actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new BadRequestException('Platform Admin must query users through the tenant-scoped endpoint');
    }
    return this.usersService.findAllForTenant(actor.tenantId);
  }
}
