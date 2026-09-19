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
  | 'VIEW_DASHBOARD'
  | 'MANAGE_CATALOG'
  | 'MANAGE_CUSTOM_ORDERS';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_ADMIN: [],
  // Same exception as the backend: Owner gets every operational
  // permission (can cover the floor when short-staffed) except
  // ASSIGN_ROLES, which is a separate, deliberate staff-management
  // decision.
  OWNER: [
    'VIEW_DASHBOARD',
    'MANAGE_CATALOG',
    'TAKE_ORDER',
    'EDIT_PRE_KITCHEN_ITEM',
    'SEND_TO_KITCHEN',
    'APPLY_DISCOUNT',
    'HANDLE_PAYMENT',
    'ENTER_EXPENSE',
    'MANAGE_CUSTOM_ORDERS',
  ],
  MANAGER: ['VIEW_DASHBOARD', 'ENTER_EXPENSE', 'MANAGE_CATALOG', 'MANAGE_CUSTOM_ORDERS'],
  CASHIER: [
    'TAKE_ORDER',
    'EDIT_PRE_KITCHEN_ITEM',
    'SEND_TO_KITCHEN',
    'APPLY_DISCOUNT',
    'HANDLE_PAYMENT',
    'ENTER_EXPENSE',
    'MANAGE_CUSTOM_ORDERS',
  ],
  WAITER: ['TAKE_ORDER', 'EDIT_PRE_KITCHEN_ITEM', 'SEND_TO_KITCHEN'],
  COOK: [],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
