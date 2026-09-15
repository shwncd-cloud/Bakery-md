import { PaymentMethod } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderItemIds!: string[];

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
