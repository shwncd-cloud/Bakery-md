import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus } from '@prisma/client';
import { getCurrentShift } from '../common/shift.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, takenByUserId: string, dto: CreateOrderItemDto) {
    const [table, product] = await Promise.all([
      this.prisma.table.findUnique({ where: { id: dto.tableId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);
    if (!table || table.tenantId !== tenantId) {
      throw new NotFoundException('Table not found');
    }
    if (!product || product.tenantId !== tenantId || !product.active) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.orderItem.create({
      data: {
        tenantId,
        tableId: dto.tableId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPriceCents: product.unitPriceCents,
        takenByUserId,
        shift: getCurrentShift(),
      },
      include: { product: true },
    });
  }

  /// Enforces the "no changes once the kitchen has it" rule agreed during
  /// discovery: an item can only be edited/canceled while still ORDERED.
  async update(tenantId: string, orderItemId: string, dto: UpdateOrderItemDto) {
    const item = await this.getOwnedOrderedItem(tenantId, orderItemId);
    return this.prisma.orderItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
      include: { product: true, discounts: true },
    });
  }

  async cancel(tenantId: string, orderItemId: string) {
    const item = await this.getOwnedOrderedItem(tenantId, orderItemId);
    return this.prisma.orderItem.update({
      where: { id: item.id },
      data: { status: OrderItemStatus.CANCELED },
    });
  }

  private async getOwnedOrderedItem(tenantId: string, orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException('Order item not found');
    }
    if (item.status !== OrderItemStatus.ORDERED) {
      throw new ForbiddenException('This item is locked: preparation has already started or it is settled');
    }
    return item;
  }
}
