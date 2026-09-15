import { IsInt, IsString, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  tableId!: string;

  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
