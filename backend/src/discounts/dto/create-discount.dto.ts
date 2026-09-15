import { DiscountType } from '@prisma/client';
import { IsEnum, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateDiscountDto {
  @IsEnum(DiscountType)
  type!: DiscountType;

  /// PERCENT: 0-100. FIXED: cents.
  @IsInt()
  @Min(1)
  value!: number;

  /// Mandatory: the accountability control against discount abuse
  /// identified during discovery, not an optional field.
  @IsString()
  @MinLength(3)
  reason!: string;
}
