import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { REPORT_PERIODS, ReportPeriod } from '../../common/period.util';

export class ReportQueryDto {
  @IsIn(REPORT_PERIODS)
  period!: ReportPeriod;

  /// Defaults to now if omitted - lets the owner also look at past periods.
  @IsOptional()
  @IsISO8601()
  date?: string;
}
