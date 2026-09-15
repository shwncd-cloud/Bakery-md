import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { SendToKitchenDto } from './dto/send-to-kitchen.dto';
import { KitchenTicketsService } from './kitchen-tickets.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kitchen-tickets')
export class KitchenTicketsController {
  constructor(private readonly kitchenTicketsService: KitchenTicketsService) {}

  @Post()
  @RequirePermissions(Permission.SEND_TO_KITCHEN)
  send(@CurrentUser() actor: CurrentUserPayload, @Body() dto: SendToKitchenDto) {
    return this.kitchenTicketsService.sendToKitchen(requireTenantId(actor), dto.tableId);
  }

  @Post(':id/reprint')
  @RequirePermissions(Permission.SEND_TO_KITCHEN)
  reprint(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.kitchenTicketsService.reprint(requireTenantId(actor), id);
  }

  @Get(':id')
  findOne(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.kitchenTicketsService.findOne(requireTenantId(actor), id);
  }
}
