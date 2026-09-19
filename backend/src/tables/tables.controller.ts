import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CreateTableDto } from './dto/create-table.dto';
import { MergeTableDto } from './dto/merge-table.dto';
import { TablesService } from './tables.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @RequirePermissions(Permission.MANAGE_CATALOG)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateTableDto) {
    return this.tablesService.create(requireTenantId(actor), dto);
  }

  @Get()
  findAll(@CurrentUser() actor: CurrentUserPayload) {
    return this.tablesService.findAllForTenant(requireTenantId(actor));
  }

  @Get(':id/items')
  openItems(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.tablesService.openItems(requireTenantId(actor), id);
  }

  @Post(':id/merge')
  @RequirePermissions(Permission.TAKE_ORDER)
  merge(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: MergeTableDto) {
    return this.tablesService.mergeTable(requireTenantId(actor), id, dto.intoTableId);
  }
}
