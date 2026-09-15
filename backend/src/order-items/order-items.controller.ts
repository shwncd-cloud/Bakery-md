import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderItemsService } from './order-items.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Post()
  @RequirePermissions(Permission.TAKE_ORDER)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateOrderItemDto) {
    return this.orderItemsService.create(requireTenantId(actor), actor.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EDIT_PRE_KITCHEN_ITEM)
  update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateOrderItemDto) {
    return this.orderItemsService.update(requireTenantId(actor), id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.EDIT_PRE_KITCHEN_ITEM)
  cancel(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.orderItemsService.cancel(requireTenantId(actor), id);
  }
}
