import { Role } from '@prisma/client';

/// Actions gated by the role/permission matrix described in the
/// architecture design (Task 002, Step 2). New verticals add new
/// permissions and role sets here, not scattered `if (role === ...)`
/// checks throughout the codebase.
export enum Permission {
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  MANAGE_TENANT_USERS = 'MANAGE_TENANT_USERS',
  MANAGE_CATALOG = 'MANAGE_CATALOG',
  TAKE_ORDER = 'TAKE_ORDER',
  EDIT_PRE_KITCHEN_ITEM = 'EDIT_PRE_KITCHEN_ITEM',
  SEND_TO_KITCHEN = 'SEND_TO_KITCHEN',
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  HANDLE_PAYMENT = 'HANDLE_PAYMENT',
  ENTER_EXPENSE = 'ENTER_EXPENSE',
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
}

/// Static role -> permission matrix. ASSIGN_ROLES for OWNER is deliberately
/// absent here: it is granted dynamically, per tenant, only once that
/// tenant's roleAssignmentDelegated flag is turned on by a Platform Admin
/// (see PermissionsGuard). Everyone else's permissions are fixed.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_ADMIN: [Permission.ASSIGN_ROLES, Permission.MANAGE_TENANT_USERS, Permission.MANAGE_CATALOG],
  OWNER: [Permission.VIEW_DASHBOARD, Permission.MANAGE_CATALOG],
  MANAGER: [Permission.VIEW_DASHBOARD, Permission.ENTER_EXPENSE, Permission.MANAGE_CATALOG],
  CASHIER: [
    Permission.TAKE_ORDER,
    Permission.EDIT_PRE_KITCHEN_ITEM,
    Permission.SEND_TO_KITCHEN,
    Permission.APPLY_DISCOUNT,
    Permission.HANDLE_PAYMENT,
    Permission.ENTER_EXPENSE,
  ],
  WAITER: [Permission.TAKE_ORDER, Permission.EDIT_PRE_KITCHEN_ITEM, Permission.SEND_TO_KITCHEN],
  COOK: [],
};
