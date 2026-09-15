import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        unitPriceCents: dto.unitPriceCents,
        requiresKitchenTicket: dto.requiresKitchenTicket ?? false,
        trackQuantitySold: dto.trackQuantitySold ?? false,
      },
    });
  }

  findAllForTenant(tenantId: string) {
    return this.prisma.product.findMany({ where: { tenantId, active: true } });
  }

  async update(tenantId: string, productId: string, dto: UpdateProductDto) {
    await this.assertBelongsToTenant(tenantId, productId);
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  /// Marking inactive is how a product is "removed" - existing OrderItems
  /// keep their price snapshot, so history is never rewritten.
  async deactivate(tenantId: string, productId: string) {
    await this.assertBelongsToTenant(tenantId, productId);
    return this.prisma.product.update({ where: { id: productId }, data: { active: false } });
  }

  private async assertBelongsToTenant(tenantId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new NotFoundException('Product not found');
    }
  }
}
