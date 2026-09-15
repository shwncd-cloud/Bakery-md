import { Module } from '@nestjs/common';
import { MonthlySummaryService } from './monthly-summary.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, MonthlySummaryService],
})
export class ReportsModule {}
