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
@RequirePermissions(Permission.SEND_TO_KITCHEN)
@Controller('kitchen-tickets')
export class KitchenTicketsController {
  constructor(private readonly kitchenTicketsService: KitchenTicketsService) {}

  @Post()
  send(@CurrentUser() actor: CurrentUserPayload, @Body() dto: SendToKitchenDto) {
    return this.kitchenTicketsService.sendToKitchen(requireTenantId(actor), dto.tableId);
  }

  /// Polled by the local print bridge - must be declared before the
  /// ':id' route below, or Nest would try to match "pending" as an id.
  @Get('pending')
  findPending(@CurrentUser() actor: CurrentUserPayload) {
    return this.kitchenTicketsService.findPending(requireTenantId(actor));
  }

  @Post(':id/reprint')
  reprint(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.kitchenTicketsService.reprint(requireTenantId(actor), id);
  }

  @Post(':id/mark-printed')
  markPrinted(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.kitchenTicketsService.markPrinted(requireTenantId(actor), id);
  }

  @Get(':id')
  findOne(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.kitchenTicketsService.findOne(requireTenantId(actor), id);
  }
}
