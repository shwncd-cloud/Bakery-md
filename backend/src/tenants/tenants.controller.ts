import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../common/permissions.decorator';
import { Permission } from '../common/permissions';
import { PermissionsGuard } from '../common/permissions.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermissions(Permission.MANAGE_TENANT_USERS)
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.MANAGE_TENANT_USERS)
  findAll() {
    return this.tenantsService.findAll();
  }

  @Patch(':id/role-assignment-delegation')
  @RequirePermissions(Permission.ASSIGN_ROLES)
  setDelegation(@Param('id') id: string, @Body('delegated') delegated: boolean) {
    return this.tenantsService.setRoleAssignmentDelegated(id, delegated);
  }
}
