export type Role = 'PLATFORM_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'COOK';

export interface AuthUser {
  id: string;
  fullName: string;
  role: Role;
  tenantId: string | null;
}

export interface Product {
  id: string;
  name: string;
  unitPriceCents: number;
  requiresKitchenTicket: boolean;
  trackQuantitySold: boolean;
  active: boolean;
}

export interface TableSummary {
  id: string;
  label: string;
}

export type OrderItemStatus = 'ORDERED' | 'SENT_TO_KITCHEN' | 'SERVED' | 'PAID' | 'CANCELED';

export interface OrderItem {
  id: string;
  tableId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  status: OrderItemStatus;
  takenByUserId: string;
  kitchenTicketId: string | null;
  paymentId: string | null;
  product: Product;
  discounts?: Discount[];
}

export interface Discount {
  id: string;
  orderItemId: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  reason: string;
}

export interface KitchenTicket {
  id: string;
  tableId: string;
  printedAt: string | null;
  orderItems: OrderItem[];
  printResult?: { success: boolean; error?: string };
}

export interface Payment {
  id: string;
  method: 'CASH' | 'TRANSFER';
  amountCents: number;
  orderItems: OrderItem[];
}

export interface Expense {
  id: string;
  category: string;
  amountCents: number;
  description: string | null;
  createdAt: string;
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

export interface SalesSummary {
  period: ReportPeriod;
  start: string;
  end: string;
  totalSalesCents: number;
  totalExpensesCents: number;
  netCents: number;
}

export interface ProductBreakdownRow {
  productId: string;
  name: string;
  unitsSold: number;
  revenueCents: number;
}

export interface WaiterPerformanceRow {
  userId: string;
  fullName: string;
  itemsSold: number;
  revenueCents: number;
}

export interface ExpenseBreakdownRow {
  category: string;
  totalCents: number;
}
