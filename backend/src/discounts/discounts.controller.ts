import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountsService } from './discounts.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('order-items/:orderItemId/discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @RequirePermissions(Permission.APPLY_DISCOUNT)
  create(
    @CurrentUser() actor: CurrentUserPayload,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: CreateDiscountDto,
  ) {
    return this.discountsService.create(requireTenantId(actor), actor.userId, orderItemId, dto);
  }
}
