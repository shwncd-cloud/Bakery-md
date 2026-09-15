import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CurrentUserPayload } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: CurrentUserPayload, dto: CreateUserDto) {
    const tenantId = actor.role === Role.PLATFORM_ADMIN ? dto.tenantId : actor.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    if (dto.role === Role.PLATFORM_ADMIN) {
      throw new BadRequestException('Platform Admin accounts cannot be created through this endpoint');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        tenantId,
        nationalId: dto.nationalId,
        fullName: dto.fullName,
        passwordHash,
        role: dto.role,
        email: dto.email,
      },
      select: { id: true, nationalId: true, fullName: true, role: true, tenantId: true, active: true, email: true },
    });
  }

  findAllForTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, nationalId: true, fullName: true, role: true, active: true },
    });
  }
}
