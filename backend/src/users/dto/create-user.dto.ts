import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

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

  /// Required in practice for Owner/Manager - it's where the monthly
  /// summary email goes - but not enforced here since Cashier/Waiter/Cook
  /// don't need one.
  @IsOptional()
  @IsEmail()
  email?: string;
}
