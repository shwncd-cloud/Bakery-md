import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions(Permission.HANDLE_PAYMENT)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(requireTenantId(actor), actor.userId, dto);
  }

  @Get(':id')
  @RequirePermissions(Permission.HANDLE_PAYMENT)
  findOne(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.paymentsService.findOne(requireTenantId(actor), id);
  }
}
