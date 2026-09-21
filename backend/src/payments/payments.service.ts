import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus } from '@prisma/client';
import { getPeriodRange, ReportPeriod } from '../common/period.util';
import { orderItemLineTotalCents } from '../common/order-item-pricing.util';
import { getCurrentShift } from '../common/shift.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const UNSETTLEABLE_STATUSES: OrderItemStatus[] = [OrderItemStatus.PAID, OrderItemStatus.CANCELED];

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /// Settles one or more OrderItems (or part of their quantity) in a
  /// single payment. Per-item billing is what makes this work for a
  /// shared table: a cashier can pay for just the items - or even just
  /// some of the units of one item - that one party ordered, leaving the
  /// rest of the table open.
  async create(tenantId: string, processedByUserId: string, dto: CreatePaymentDto) {
    const requestedQuantities = new Map<string, number>();
    for (const entry of dto.items) {
      requestedQuantities.set(entry.orderItemId, (requestedQuantities.get(entry.orderItemId) ?? 0) + entry.quantity);
    }
    const ids = Array.from(requestedQuantities.keys());
    const items = await this.prisma.orderItem.findMany({
      where: { id: { in: ids } },
      include: { discounts: true },
    });

    if (items.length !== ids.length || items.some((item) => item.tenantId !== tenantId)) {
      throw new NotFoundException('One or more order items not found');
    }
    const alreadySettled = items.filter((item) => UNSETTLEABLE_STATUSES.includes(item.status));
    if (alreadySettled.length > 0) {
      throw new BadRequestException('One or more order items are already paid or canceled');
    }
    for (const item of items) {
      const requested = requestedQuantities.get(item.id)!;
      if (requested > item.quantity) {
        throw new BadRequestException(`Cannot pay for ${requested} units of an item that only has ${item.quantity}`);
      }
      // A discount is recorded against the whole line, not per unit, so
      // splitting a discounted item into a paid/unpaid portion would make
      // the discount's meaning ambiguous - block it rather than guess.
      if (requested < item.quantity && item.discounts.length > 0) {
        throw new BadRequestException(
          'Cannot partially pay a discounted item - pay the full quantity, or remove the discount first',
        );
      }
    }

    const amountCents = items.reduce((sum, item) => {
      const requested = requestedQuantities.get(item.id)!;
      return sum + (requested === item.quantity ? orderItemLineTotalCents(item, item.discounts) : item.unitPriceCents * requested);
    }, 0);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          method: dto.method,
          amountCents,
          processedByUserId,
          shift: getCurrentShift(),
        },
      });

      for (const item of items) {
        const requested = requestedQuantities.get(item.id)!;
        if (requested === item.quantity) {
          await tx.orderItem.update({ where: { id: item.id }, data: { status: OrderItemStatus.PAID, paymentId: payment.id } });
        } else {
          // Split: shrink the original line (still owed, unpaid) and
          // create a separate PAID row for the settled units, so the rest
          // stays exactly as it was for whoever pays for it later.
          await tx.orderItem.update({ where: { id: item.id }, data: { quantity: item.quantity - requested } });
          await tx.orderItem.create({
            data: {
              tenantId,
              tableId: item.tableId,
              productId: item.productId,
              quantity: requested,
              unitPriceCents: item.unitPriceCents,
              note: item.note,
              status: OrderItemStatus.PAID,
              takenByUserId: item.takenByUserId,
              kitchenTicketId: item.kitchenTicketId,
              paymentId: payment.id,
              shift: item.shift,
            },
          });
        }
      }

      return tx.payment.findUnique({
        where: { id: payment.id },
        include: { orderItems: { include: { product: true } } },
      });
    });
  }

  async findOne(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { orderItems: { include: { product: true } } },
    });
    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /// Powers the admin panel's "browse a specific day/week/etc" view -
  /// same period/date semantics as the reports endpoints.
  findAllForTenant(tenantId: string, period: ReportPeriod, date?: Date) {
    const { start, end } = getPeriodRange(period, date);
    return this.prisma.payment.findMany({
      where: { tenantId, createdAt: { gte: start, lt: end } },
      include: { orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Erases a mistakenly-recorded sale (e.g. a test entry). Its order
  /// items go back to being open/unpaid rather than vanishing - a line
  /// that never went to the kitchen (no kitchenTicketId) returns to
  /// ORDERED, otherwise to SERVED, since kitchen prep already happened
  /// and shouldn't be re-queued. If this payment came from splitting a
  /// multi-unit line, the reverted portion reappears as its own line
  /// rather than re-merging into the original one - the amounts are still
  /// correct, it just shows as two rows instead of one.
  async remove(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { orderItems: true },
    });
    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('Payment not found');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of payment.orderItems) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: item.kitchenTicketId ? OrderItemStatus.SERVED : OrderItemStatus.ORDERED,
            paymentId: null,
          },
        });
      }
      await tx.payment.delete({ where: { id: paymentId } });
    });

    return { id: paymentId, deleted: true };
  }
}
