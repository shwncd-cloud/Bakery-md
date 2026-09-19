import { Injectable } from '@nestjs/common';
import { getCurrentShift } from '../common/shift.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, enteredByUserId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        tenantId,
        provider: dto.provider,
        voucherNumber: dto.voucherNumber,
        amountCents: dto.amountCents,
        description: dto.description,
        enteredByUserId,
        shift: getCurrentShift(),
      },
    });
  }

  findAllForTenant(tenantId: string) {
    return this.prisma.expense.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }
}
