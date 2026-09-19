import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { ReportQueryDto } from './dto/report-query.dto';
import { MonthlySummaryService } from './monthly-summary.service';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.VIEW_DASHBOARD)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly monthlySummaryService: MonthlySummaryService,
  ) {}

  @Post('monthly-summary/trigger')
  triggerMonthlySummary(@CurrentUser() actor: CurrentUserPayload) {
    return this.monthlySummaryService.sendForTenant(requireTenantId(actor));
  }

  @Get('summary')
  summary(@CurrentUser() actor: CurrentUserPayload, @Query() query: ReportQueryDto) {
    return this.reportsService.getSalesSummary(requireTenantId(actor), query.period, parseDate(query.date));
  }

  @Get('products')
  products(@CurrentUser() actor: CurrentUserPayload, @Query() query: ReportQueryDto) {
    return this.reportsService.getProductBreakdown(requireTenantId(actor), query.period, parseDate(query.date));
  }

  @Get('waiters')
  waiters(@CurrentUser() actor: CurrentUserPayload, @Query() query: ReportQueryDto) {
    return this.reportsService.getWaiterPerformance(requireTenantId(actor), query.period, parseDate(query.date));
  }

  @Get('expenses')
  expenses(@CurrentUser() actor: CurrentUserPayload, @Query() query: ReportQueryDto) {
    return this.reportsService.getExpenseBreakdown(requireTenantId(actor), query.period, parseDate(query.date));
  }
}

function parseDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}
