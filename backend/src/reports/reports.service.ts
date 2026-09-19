import { Injectable } from '@nestjs/common';
import { orderItemLineTotalCents } from '../common/order-item-pricing.util';
import { getPeriodRange, ReportPeriod } from '../common/period.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /// "Sales" is money actually collected (Payment.createdAt), not orders
  /// placed - matching the cash-accounting mental model from discovery
  /// ("the money received is counted").
  async getSalesSummary(tenantId: string, period: ReportPeriod, referenceDate?: Date) {
    const { start, end } = getPeriodRange(period, referenceDate);

    const [salesAgg, expensesAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, createdAt: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, createdAt: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
    ]);

    const totalSalesCents = salesAgg._sum.amountCents ?? 0;
    const totalExpensesCents = expensesAgg._sum.amountCents ?? 0;

    return {
      period,
      start,
      end,
      totalSalesCents,
      totalExpensesCents,
      netCents: totalSalesCents - totalExpensesCents,
    };
  }

  async getProductBreakdown(tenantId: string, period: ReportPeriod, referenceDate?: Date) {
    const { start, end } = getPeriodRange(period, referenceDate);
    const items = await this.prisma.orderItem.findMany({
      where: { tenantId, paymentId: { not: null }, payment: { createdAt: { gte: start, lt: end } } },
      include: { product: true, discounts: true },
    });

    const byProduct = new Map<string, { productId: string; name: string; unitsSold: number; revenueCents: number }>();
    for (const item of items) {
      const entry = byProduct.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        unitsSold: 0,
        revenueCents: 0,
      };
      entry.unitsSold += item.quantity;
      entry.revenueCents += orderItemLineTotalCents(item, item.discounts);
      byProduct.set(item.productId, entry);
    }

    return Array.from(byProduct.values()).sort((a, b) => b.revenueCents - a.revenueCents);
  }

  async getWaiterPerformance(tenantId: string, period: ReportPeriod, referenceDate?: Date) {
    const { start, end } = getPeriodRange(period, referenceDate);
    const items = await this.prisma.orderItem.findMany({
      where: { tenantId, paymentId: { not: null }, payment: { createdAt: { gte: start, lt: end } } },
      include: { discounts: true, takenByUser: true },
    });

    const byWaiter = new Map<string, { userId: string; fullName: string; itemsSold: number; revenueCents: number }>();
    for (const item of items) {
      const entry = byWaiter.get(item.takenByUserId) ?? {
        userId: item.takenByUserId,
        fullName: item.takenByUser.fullName,
        itemsSold: 0,
        revenueCents: 0,
      };
      entry.itemsSold += item.quantity;
      entry.revenueCents += orderItemLineTotalCents(item, item.discounts);
      byWaiter.set(item.takenByUserId, entry);
    }

    return Array.from(byWaiter.values()).sort((a, b) => b.revenueCents - a.revenueCents);
  }

  async getExpenseBreakdown(tenantId: string, period: ReportPeriod, referenceDate?: Date) {
    const { start, end } = getPeriodRange(period, referenceDate);
    const grouped = await this.prisma.expense.groupBy({
      by: ['provider'],
      where: { tenantId, createdAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    });

    return grouped
      .map((row) => ({ provider: row.provider, totalCents: row._sum.amountCents ?? 0 }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }
}
