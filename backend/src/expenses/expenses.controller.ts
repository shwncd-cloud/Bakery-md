import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequirePermissions(Permission.ENTER_EXPENSE)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(requireTenantId(actor), actor.userId, dto);
  }

  @Get()
  @RequirePermissions(Permission.ENTER_EXPENSE)
  findAll(@CurrentUser() actor: CurrentUserPayload) {
    return this.expensesService.findAllForTenant(requireTenantId(actor));
  }
}
