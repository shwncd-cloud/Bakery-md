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
  MANAGE_CUSTOM_ORDERS = 'MANAGE_CUSTOM_ORDERS',
  /// Erasing a recorded sale - a correction/admin action, deliberately
  /// separate from HANDLE_PAYMENT (day-to-day cash handling): only
  /// whoever can already see the dashboard should be able to do this.
  DELETE_PAYMENT = 'DELETE_PAYMENT',
}

/// Static role -> permission matrix. ASSIGN_ROLES for OWNER is deliberately
/// absent here: it is granted dynamically, per tenant, only once that
/// tenant's roleAssignmentDelegated flag is turned on by a Platform Admin
/// (see PermissionsGuard). Everyone else's permissions are fixed.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_ADMIN: [Permission.ASSIGN_ROLES, Permission.MANAGE_TENANT_USERS, Permission.MANAGE_CATALOG],
  // Owner gets every operational permission too - a small bakery's owner
  // routinely covers the floor when short-staffed. ASSIGN_ROLES is the
  // deliberate exception: staff account management stays Platform-Admin-
  // only unless explicitly delegated (see PermissionsGuard), which is a
  // separate decision from "can help take orders."
  OWNER: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_CATALOG,
    Permission.TAKE_ORDER,
    Permission.EDIT_PRE_KITCHEN_ITEM,
    Permission.SEND_TO_KITCHEN,
    Permission.APPLY_DISCOUNT,
    Permission.HANDLE_PAYMENT,
    Permission.ENTER_EXPENSE,
    Permission.MANAGE_CUSTOM_ORDERS,
    Permission.DELETE_PAYMENT,
  ],
  MANAGER: [
    Permission.VIEW_DASHBOARD,
    Permission.ENTER_EXPENSE,
    Permission.MANAGE_CATALOG,
    Permission.MANAGE_CUSTOM_ORDERS,
    Permission.DELETE_PAYMENT,
  ],
  CASHIER: [
    Permission.TAKE_ORDER,
    Permission.EDIT_PRE_KITCHEN_ITEM,
    Permission.SEND_TO_KITCHEN,
    Permission.APPLY_DISCOUNT,
    Permission.HANDLE_PAYMENT,
    Permission.ENTER_EXPENSE,
    Permission.MANAGE_CUSTOM_ORDERS,
  ],
  WAITER: [Permission.TAKE_ORDER, Permission.EDIT_PRE_KITCHEN_ITEM, Permission.SEND_TO_KITCHEN],
  COOK: [],
};
