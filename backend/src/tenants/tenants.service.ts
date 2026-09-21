import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: { name: dto.name, country: dto.country ?? 'CO' },
    });
  }

  findAll() {
    return this.prisma.tenant.findMany();
  }

  /// Platform Admin only: hands role-assignment authority to a tenant's
  /// Owner, per the delegation model agreed during architecture design.
  setRoleAssignmentDelegated(tenantId: string, delegated: boolean) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { roleAssignmentDelegated: delegated },
    });
  }
}
