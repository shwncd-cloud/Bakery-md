import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  provider!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  voucherNumber?: string;
}
