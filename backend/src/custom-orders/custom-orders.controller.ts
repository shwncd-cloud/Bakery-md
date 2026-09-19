import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CustomOrdersService } from './custom-orders.service';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { UpdateCustomOrderDto } from './dto/update-custom-order.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('custom-orders')
export class CustomOrdersController {
  constructor(private readonly customOrdersService: CustomOrdersService) {}

  @Post()
  @RequirePermissions(Permission.MANAGE_CUSTOM_ORDERS)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateCustomOrderDto) {
    return this.customOrdersService.create(requireTenantId(actor), actor.userId, dto);
  }

  @Get()
  @RequirePermissions(Permission.MANAGE_CUSTOM_ORDERS)
  findAll(@CurrentUser() actor: CurrentUserPayload) {
    return this.customOrdersService.findAllForTenant(requireTenantId(actor));
  }

  @Patch(':id')
  @RequirePermissions(Permission.MANAGE_CUSTOM_ORDERS)
  update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateCustomOrderDto) {
    return this.customOrdersService.update(requireTenantId(actor), id, dto);
  }
}
