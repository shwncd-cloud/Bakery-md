import { Module } from '@nestjs/common';
import { OrderItemsController } from './order-items.controller';
import { OrderItemsService } from './order-items.service';

@Module({
  controllers: [OrderItemsController],
  providers: [OrderItemsService],
  exports: [OrderItemsService],
})
export class OrderItemsModule {}
