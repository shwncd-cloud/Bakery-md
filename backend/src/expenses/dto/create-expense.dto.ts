import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  category!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
