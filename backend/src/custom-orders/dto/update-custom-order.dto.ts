import { IsBoolean } from 'class-validator';

export class UpdateCustomOrderDto {
  @IsBoolean()
  fulfilled!: boolean;
}
