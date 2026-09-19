import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { UpdateCustomOrderDto } from './dto/update-custom-order.dto';

@Injectable()
export class CustomOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, takenByUserId: string, dto: CreateCustomOrderDto) {
    return this.prisma.customOrder.create({
      data: {
        tenantId,
        productName: dto.productName,
        quantity: dto.quantity,
        description: dto.description,
        depositCents: dto.depositCents ?? 0,
        deliveryDate: new Date(dto.deliveryDate),
        takenByUserId,
      },
    });
  }

  findAllForTenant(tenantId: string) {
    return this.prisma.customOrder.findMany({
      where: { tenantId },
      orderBy: { deliveryDate: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCustomOrderDto) {
    const existing = await this.prisma.customOrder.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Custom order not found');
    }
    return this.prisma.customOrder.update({
      where: { id },
      data: { fulfilled: dto.fulfilled },
    });
  }
}
