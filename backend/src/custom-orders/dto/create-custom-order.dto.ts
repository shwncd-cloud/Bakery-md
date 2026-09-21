import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomOrderDto {
  @IsString()
  productName!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositCents?: number;

  @IsDateString()
  deliveryDate!: string;
}
