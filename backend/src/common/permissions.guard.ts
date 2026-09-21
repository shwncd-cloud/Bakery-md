import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { Permission, ROLE_PERMISSIONS } from './permissions';

interface AuthenticatedRequest {
  user?: { userId: string; tenantId: string | null; role: Role };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const granted = new Set(ROLE_PERMISSIONS[user.role]);

    // Dynamic delegation: an Owner only gets ASSIGN_ROLES if their own
    // tenant has explicitly turned that on (see Tenant.roleAssignmentDelegated).
    if (required.includes(Permission.ASSIGN_ROLES) && user.role === Role.OWNER && user.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
      if (tenant?.roleAssignmentDelegated) {
        granted.add(Permission.ASSIGN_ROLES);
      }
    }

    const allowed = required.every((permission) => granted.has(permission));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
    return true;
  }
}
