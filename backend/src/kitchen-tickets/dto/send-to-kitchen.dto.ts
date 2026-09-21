import { IsString } from 'class-validator';

export class SendToKitchenDto {
  @IsString()
  tableId!: string;
}
