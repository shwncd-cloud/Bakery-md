import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Role } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { getPreviousMonthRange } from '../common/period.util';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

const CENTS_PER_UNIT = 100;

function formatCOP(cents: number): string {
  return `$${(cents / CENTS_PER_UNIT).toLocaleString('es-CO')}`;
}

/// The monthly owner email requested during discovery: "easy-to-understand
/// information that supports decision-making." Runs automatically on the
/// 1st of each month, and can be triggered on demand (see
/// ReportsController) to check or resend without waiting for the schedule.
@Injectable()
export class MonthlySummaryService {
  private readonly logger = new Logger(MonthlySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 6 1 * *')
  async sendForAllTenants() {
    const tenants = await this.prisma.tenant.findMany();
    for (const tenant of tenants) {
      await this.sendForTenant(tenant.id);
    }
  }

  async sendForTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const recipients = await this.prisma.user.findMany({
      where: { tenantId, role: { in: [Role.OWNER, Role.MANAGER] }, email: { not: null }, active: true },
    });
    if (recipients.length === 0) {
      this.logger.warn(`No Owner/Manager with an email on file for tenant ${tenant.name} - skipping`);
      return { sent: 0 };
    }

    const { start, end } = getPreviousMonthRange();
    const referenceDate = new Date(start.getTime() + 1);
    const [summary, products, expenses] = await Promise.all([
      this.reportsService.getSalesSummary(tenantId, 'month', referenceDate),
      this.reportsService.getProductBreakdown(tenantId, 'month', referenceDate),
      this.reportsService.getExpenseBreakdown(tenantId, 'month', referenceDate),
    ]);

    const subject = `${tenant.name} - Monthly summary for ${start.toLocaleString('es-CO', { month: 'long', year: 'numeric' })}`;
    const body = this.renderBody(tenant.name, summary, products, expenses, start, end);

    let sent = 0;
    for (const recipient of recipients) {
      const result = await this.emailService.send(recipient.email!, subject, body);
      if (result.success) sent += 1;
    }
    return { sent, totalRecipients: recipients.length };
  }

  private renderBody(
    tenantName: string,
    summary: { totalSalesCents: number; totalExpensesCents: number; netCents: number },
    products: { name: string; unitsSold: number; revenueCents: number }[],
    expenses: { provider: string; totalCents: number }[],
    start: Date,
    end: Date,
  ): string {
    const lines = [
      `${tenantName} - Monthly Summary`,
      `${start.toLocaleDateString('es-CO')} to ${end.toLocaleDateString('es-CO')}`,
      '',
      `Total sales: ${formatCOP(summary.totalSalesCents)}`,
      `Total expenses: ${formatCOP(summary.totalExpensesCents)}`,
      `Net: ${formatCOP(summary.netCents)}`,
      '',
      'Top products:',
      ...products.slice(0, 10).map((p) => `  ${p.name}: ${p.unitsSold} units, ${formatCOP(p.revenueCents)}`),
      '',
      'Expenses by provider:',
      ...expenses.map((e) => `  ${e.provider}: ${formatCOP(e.totalCents)}`),
    ];
    return lines.join('\n');
  }
}
