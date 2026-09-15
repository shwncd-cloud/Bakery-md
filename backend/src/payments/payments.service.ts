import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus } from '@prisma/client';
import { orderItemLineTotalCents } from '../common/order-item-pricing.util';
import { getCurrentShift } from '../common/shift.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const UNSETTLEABLE_STATUSES: OrderItemStatus[] = [OrderItemStatus.PAID, OrderItemStatus.CANCELED];

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /// Settles one or more OrderItems in a single payment. Per-item billing
  /// is what makes this work for a shared table: a cashier can pay for
  /// just the items one party ordered, leaving the rest of the table open.
  async create(tenantId: string, processedByUserId: string, dto: CreatePaymentDto) {
    const uniqueIds = Array.from(new Set(dto.orderItemIds));
    const items = await this.prisma.orderItem.findMany({
      where: { id: { in: uniqueIds } },
      include: { discounts: true },
    });

    if (items.length !== uniqueIds.length || items.some((item) => item.tenantId !== tenantId)) {
      throw new NotFoundException('One or more order items not found');
    }
    const alreadySettled = items.filter((item) => UNSETTLEABLE_STATUSES.includes(item.status));
    if (alreadySettled.length > 0) {
      throw new BadRequestException('One or more order items are already paid or canceled');
    }

    const amountCents = items.reduce((sum, item) => sum + orderItemLineTotalCents(item, item.discounts), 0);

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
      await tx.orderItem.updateMany({
        where: { id: { in: uniqueIds } },
        data: { status: OrderItemStatus.PAID, paymentId: payment.id },
      });
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
}
