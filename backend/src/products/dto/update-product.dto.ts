import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number;

  @IsOptional()
  @IsBoolean()
  requiresKitchenTicket?: boolean;

  @IsOptional()
  @IsBoolean()
  trackQuantitySold?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  category?: string;
}
