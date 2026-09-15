import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterService } from '../printing/printer.service';

type TicketWithItems = Prisma.KitchenTicketGetPayload<{
  include: { table: true; orderItems: { include: { product: true } } };
}>;

@Injectable()
export class KitchenTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printer: PrinterService,
  ) {}

  /// Bundles every currently-ORDERED, kitchen-required item on a table
  /// into one ticket, locks those items from further waiter edits, and
  /// attempts to print. Printing is best-effort: a printer failure does
  /// not lose the order, it leaves printedAt null so it can be retried
  /// (see reprint) - matching "if another printout is needed, it can be
  /// requested through the app."
  async sendToKitchen(tenantId: string, tableId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table || table.tenantId !== tenantId) {
      throw new NotFoundException('Table not found');
    }

    const eligibleItems = await this.prisma.orderItem.findMany({
      where: {
        tenantId,
        tableId,
        status: OrderItemStatus.ORDERED,
        product: { requiresKitchenTicket: true },
      },
    });
    if (eligibleItems.length === 0) {
      throw new BadRequestException('No items awaiting kitchen prep for this table');
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.kitchenTicket.create({ data: { tenantId, tableId } });
      await tx.orderItem.updateMany({
        where: { id: { in: eligibleItems.map((i) => i.id) } },
        data: { status: OrderItemStatus.SENT_TO_KITCHEN, kitchenTicketId: created.id },
      });
      return created;
    });

    return this.printAndUpdate(tenantId, ticket.id);
  }

  async reprint(tenantId: string, ticketId: string) {
    return this.printAndUpdate(tenantId, ticketId);
  }

  async findOne(tenantId: string, ticketId: string) {
    const ticket = await this.loadTicket(ticketId);
    if (!ticket || ticket.tenantId !== tenantId) {
      throw new NotFoundException('Kitchen ticket not found');
    }
    return ticket;
  }

  private async printAndUpdate(tenantId: string, ticketId: string) {
    const ticket = await this.loadTicket(ticketId);
    if (!ticket || ticket.tenantId !== tenantId) {
      throw new NotFoundException('Kitchen ticket not found');
    }

    const result = await this.printer.print(this.renderTicketText(ticket));

    const updated = await this.prisma.kitchenTicket.update({
      where: { id: ticket.id },
      data: result.success ? { printedAt: new Date() } : {},
    });

    return { ...updated, orderItems: ticket.orderItems, table: ticket.table, printResult: result };
  }

  private loadTicket(ticketId: string): Promise<TicketWithItems | null> {
    return this.prisma.kitchenTicket.findUnique({
      where: { id: ticketId },
      include: { table: true, orderItems: { include: { product: true } } },
    });
  }

  private renderTicketText(ticket: TicketWithItems): string {
    const lines = [
      'KITCHEN TICKET',
      `Table: ${ticket.table.label}`,
      new Date().toLocaleString('es-CO'),
      '------------------------',
      ...ticket.orderItems.map((item) => `${item.quantity}x ${item.product.name}`),
      '------------------------',
    ];
    return lines.join('\n');
  }
}
