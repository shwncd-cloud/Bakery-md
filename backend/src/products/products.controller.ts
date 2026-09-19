import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { RequirePermissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { requireTenantId } from '../common/require-tenant.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions(Permission.MANAGE_CATALOG)
  create(@CurrentUser() actor: CurrentUserPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(requireTenantId(actor), dto);
  }

  @Get()
  findAll(@CurrentUser() actor: CurrentUserPayload) {
    return this.productsService.findAllForTenant(requireTenantId(actor));
  }

  @Patch(':id')
  @RequirePermissions(Permission.MANAGE_CATALOG)
  update(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(requireTenantId(actor), id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.MANAGE_CATALOG)
  deactivate(@CurrentUser() actor: CurrentUserPayload, @Param('id') id: string) {
    return this.productsService.deactivate(requireTenantId(actor), id);
  }
}
