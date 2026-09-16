import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { DiscountsModule } from './discounts/discounts.module';
import { EmailModule } from './email/email.module';
import { ExpensesModule } from './expenses/expenses.module';
import { KitchenTicketsModule } from './kitchen-tickets/kitchen-tickets.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { TablesModule } from './tables/tables.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ProductsModule,
    TablesModule,
    OrderItemsModule,
    KitchenTicketsModule,
    DiscountsModule,
    PaymentsModule,
    ExpensesModule,
    ReportsModule,
  ],
})
export class AppModule {}
