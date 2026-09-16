import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TicketWithItems = Prisma.KitchenTicketGetPayload<{
  include: { table: true; orderItems: { include: { product: true } } };
}>;

/// The backend never talks to the printer directly - a cloud-hosted
/// server has no route into the bakery's local network. It only queues
/// tickets (printedAt null); the local print bridge polls
/// GET /kitchen-tickets/pending and confirms via mark-printed. See
/// bridge/README.md.
@Injectable()
export class KitchenTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /// Bundles every currently-ORDERED, kitchen-required item on a table
  /// into one ticket and locks those items from further waiter edits.
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

    return this.loadTicket(tenantId, ticket.id);
  }

  /// "If another printout is needed, it can be requested through the
  /// app" - clearing printedAt just re-queues it for the bridge's next
  /// poll, whether it never printed or the copy was lost/damaged.
  async reprint(tenantId: string, ticketId: string) {
    await this.findOne(tenantId, ticketId);
    await this.prisma.kitchenTicket.update({ where: { id: ticketId }, data: { printedAt: null } });
    return this.loadTicket(tenantId, ticketId);
  }

  async findOne(tenantId: string, ticketId: string) {
    const ticket = await this.loadTicket(tenantId, ticketId);
    if (!ticket) {
      throw new NotFoundException('Kitchen ticket not found');
    }
    return ticket;
  }

  /// Polled by the print bridge. Rendered ticketText is included so the
  /// bridge stays a dumb relay - ticket layout knowledge lives here, once.
  async findPending(tenantId: string) {
    const tickets = await this.prisma.kitchenTicket.findMany({
      where: { tenantId, printedAt: null },
      include: { table: true, orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return tickets.map((ticket) => ({ ...ticket, ticketText: this.renderTicketText(ticket) }));
  }

  async markPrinted(tenantId: string, ticketId: string) {
    await this.findOne(tenantId, ticketId);
    await this.prisma.kitchenTicket.update({ where: { id: ticketId }, data: { printedAt: new Date() } });
    return { id: ticketId, printedAt: new Date() };
  }

  private async loadTicket(tenantId: string, ticketId: string): Promise<TicketWithItems | null> {
    const ticket = await this.prisma.kitchenTicket.findUnique({
      where: { id: ticketId },
      include: { table: true, orderItems: { include: { product: true } } },
    });
    return ticket && ticket.tenantId === tenantId ? ticket : null;
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
