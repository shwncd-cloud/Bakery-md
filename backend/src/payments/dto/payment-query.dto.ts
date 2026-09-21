import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { REPORT_PERIODS, ReportPeriod } from '../../common/period.util';

export class PaymentQueryDto {
  @IsIn(REPORT_PERIODS)
  period!: ReportPeriod;

  /// Defaults to now if omitted - a plain "YYYY-MM-DD" from a date picker
  /// is treated as that calendar day in Bogotá time (see parseReportDate).
  @IsOptional()
  @IsISO8601()
  date?: string;
}
