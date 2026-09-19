import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  nationalId!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
