import { BadRequestException } from '@nestjs/common';
import { CurrentUserPayload } from './current-user.decorator';

/// Operational endpoints (catalog, tables, orders...) act on a single
/// tenant's data and assume the caller is scoped to one. Platform Admin
/// accounts have no tenantId and aren't meant to call these directly.
export function requireTenantId(actor: CurrentUserPayload): string {
  if (!actor.tenantId) {
    throw new BadRequestException('This action requires a tenant-scoped account');
  }
  return actor.tenantId;
}
