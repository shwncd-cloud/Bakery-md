import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { KitchenTicketsModule } from './kitchen-tickets/kitchen-tickets.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { PrintingModule } from './printing/printing.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { TablesModule } from './tables/tables.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PrintingModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ProductsModule,
    TablesModule,
    OrderItemsModule,
    KitchenTicketsModule,
  ],
})
export class AppModule {}
