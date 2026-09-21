import { Module } from '@nestjs/common';
import { KitchenTicketsController } from './kitchen-tickets.controller';
import { KitchenTicketsService } from './kitchen-tickets.service';

@Module({
  controllers: [KitchenTicketsController],
  providers: [KitchenTicketsService],
  exports: [KitchenTicketsService],
})
export class KitchenTicketsModule {}
