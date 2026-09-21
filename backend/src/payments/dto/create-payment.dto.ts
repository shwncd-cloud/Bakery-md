import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class PaymentItemDto {
  @IsString()
  orderItemId!: string;

  /// How many units of this order item this payment settles. Lets a
  /// cashier collect for part of a multi-unit line (e.g. 1 of 2 coffees)
  /// while leaving the rest open for someone else to pay later.
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreatePaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items!: PaymentItemDto[];

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
