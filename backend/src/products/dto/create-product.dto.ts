import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  unitPriceCents!: number;

  @IsOptional()
  @IsBoolean()
  requiresKitchenTicket?: boolean;

  @IsOptional()
  @IsBoolean()
  trackQuantitySold?: boolean;
}
