import type { Role } from '../api/types';

/// UI-only mirror of the backend's role/permission matrix
/// (backend/src/common/permissions.ts) - purely for showing/hiding
/// controls. The API is the real enforcement point; a mismatch here is a
/// UX inconvenience, never a security boundary.
export type Permission =
  | 'TAKE_ORDER'
  | 'EDIT_PRE_KITCHEN_ITEM'
  | 'SEND_TO_KITCHEN'
  | 'APPLY_DISCOUNT'
  | 'HANDLE_PAYMENT'
  | 'ENTER_EXPENSE'
  | 'VIEW_DASHBOARD';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_ADMIN: [],
  OWNER: ['VIEW_DASHBOARD'],
  MANAGER: ['VIEW_DASHBOARD', 'ENTER_EXPENSE'],
  CASHIER: ['TAKE_ORDER', 'EDIT_PRE_KITCHEN_ITEM', 'SEND_TO_KITCHEN', 'APPLY_DISCOUNT', 'HANDLE_PAYMENT', 'ENTER_EXPENSE'],
  WAITER: ['TAKE_ORDER', 'EDIT_PRE_KITCHEN_ITEM', 'SEND_TO_KITCHEN'],
  COOK: [],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
