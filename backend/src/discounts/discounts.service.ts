import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, appliedByUserId: string, orderItemId: string, dto: CreateDiscountDto) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { discounts: true },
    });
    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException('Order item not found');
    }
    if (item.status === OrderItemStatus.PAID || item.status === OrderItemStatus.CANCELED) {
      throw new BadRequestException('Cannot discount an item that is already paid or canceled');
    }
    if (item.discounts.length > 0) {
      throw new BadRequestException('This item already has a discount applied');
    }
    if (dto.type === 'PERCENT' && dto.value > 100) {
      throw new BadRequestException('A percent discount cannot exceed 100');
    }

    return this.prisma.discount.create({
      data: {
        tenantId,
        orderItemId,
        type: dto.type,
        value: dto.value,
        reason: dto.reason,
        appliedByUserId,
      },
    });
  }
}
