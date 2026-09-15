import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';

const OPEN_STATUSES: OrderItemStatus[] = [
  OrderItemStatus.ORDERED,
  OrderItemStatus.SENT_TO_KITCHEN,
  OrderItemStatus.SERVED,
];

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateTableDto) {
    return this.prisma.table.create({ data: { tenantId, label: dto.label } });
  }

  findAllForTenant(tenantId: string) {
    return this.prisma.table.findMany({ where: { tenantId } });
  }

  /// Covers both "merge two tables into one" and "move a party to another
  /// table" - both are just reassigning open OrderItems to the target
  /// table. Paid/canceled items are historical and stay put.
  async mergeTable(tenantId: string, fromTableId: string, intoTableId: string) {
    if (fromTableId === intoTableId) {
      throw new BadRequestException('Cannot merge a table into itself');
    }
    const [fromTable, intoTable] = await Promise.all([
      this.prisma.table.findUnique({ where: { id: fromTableId } }),
      this.prisma.table.findUnique({ where: { id: intoTableId } }),
    ]);
    if (!fromTable || fromTable.tenantId !== tenantId || !intoTable || intoTable.tenantId !== tenantId) {
      throw new NotFoundException('Table not found');
    }

    await this.prisma.orderItem.updateMany({
      where: { tenantId, tableId: fromTableId, status: { in: OPEN_STATUSES } },
      data: { tableId: intoTableId },
    });

    return this.prisma.table.findUnique({
      where: { id: intoTableId },
      include: { orderItems: { where: { status: { in: OPEN_STATUSES } } } },
    });
  }

  async openItems(tenantId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table || table.tenantId !== tenantId) {
      throw new NotFoundException('Table not found');
    }
    return this.prisma.orderItem.findMany({
      where: { tenantId, tableId, status: { in: OPEN_STATUSES } },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
