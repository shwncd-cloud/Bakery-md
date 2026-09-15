import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  /// Required when the caller is a Platform Admin (who can target any
  /// tenant). Ignored for a delegated Owner, whose own tenant is used.
  tenantId?: string;

  @IsString()
  nationalId!: string;

  @IsString()
  fullName!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
