import { enqueue, getQueue, removeFromQueue } from '../offline/outbox';
import type {
  AuthUser,
  Discount,
  Expense,
  ExpenseBreakdownRow,
  KitchenTicket,
  OrderItem,
  Payment,
  Product,
  ProductBreakdownRow,
  ReportPeriod,
  SalesSummary,
  TableSummary,
  WaiterPerformanceRow,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'hornillas_token';
const USER_KEY = 'hornillas_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function storeSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export class NetworkError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError(`Network unreachable calling ${method} ${path}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(payload.message ?? 'Request failed', response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ---- Auth ----
export function login(nationalId: string, password: string) {
  return request<{ accessToken: string; user: AuthUser }>('POST', '/auth/login', { nationalId, password });
}

// ---- Catalog ----
export function listProducts() {
  return request<Product[]>('GET', '/products');
}

export interface CreateProductInput {
  name: string;
  unitPriceCents: number;
  requiresKitchenTicket: boolean;
  trackQuantitySold: boolean;
}

export function createProduct(input: CreateProductInput) {
  return request<Product>('POST', '/products', input);
}

export function deactivateProduct(productId: string) {
  return request<Product>('DELETE', `/products/${productId}`);
}

// ---- Tables ----
export function listTables() {
  return request<TableSummary[]>('GET', '/tables');
}

export function createTable(label: string) {
  return request<TableSummary>('POST', '/tables', { label });
}

export function getTableItems(tableId: string) {
  return request<OrderItem[]>('GET', `/tables/${tableId}/items`);
}

export function mergeTable(fromTableId: string, intoTableId: string) {
  return request<TableSummary & { orderItems: OrderItem[] }>('POST', `/tables/${fromTableId}/merge`, {
    intoTableId,
  });
}

// ---- Order items (offline-resilient: taking an order must survive a
// brief connectivity drop) ----
export interface OptimisticOrderItem extends OrderItem {
  pendingSync?: boolean;
}

export async function createOrderItem(
  tableId: string,
  product: Product,
  quantity: number,
  takenByUserId: string,
): Promise<OptimisticOrderItem> {
  const body = { tableId, productId: product.id, quantity };
  try {
    return await request<OrderItem>('POST', '/order-items', body);
  } catch (err) {
    if (!(err instanceof NetworkError)) throw err;
    enqueue({ method: 'POST', path: '/order-items', body, kind: 'order-item' });
    return {
      id: `local-${crypto.randomUUID()}`,
      tableId,
      productId: product.id,
      quantity,
      unitPriceCents: product.unitPriceCents,
      status: 'ORDERED',
      takenByUserId,
      kitchenTicketId: null,
      paymentId: null,
      product,
      pendingSync: true,
    };
  }
}

export function updateOrderItem(id: string, quantity: number) {
  return request<OrderItem>('PATCH', `/order-items/${id}`, { quantity });
}

export function cancelOrderItem(id: string) {
  return request<OrderItem>('DELETE', `/order-items/${id}`);
}

// ---- Kitchen tickets ----
export function sendToKitchen(tableId: string) {
  return request<KitchenTicket>('POST', '/kitchen-tickets', { tableId });
}

export function reprintTicket(ticketId: string) {
  return request<KitchenTicket>('POST', `/kitchen-tickets/${ticketId}/reprint`);
}

// ---- Discounts ----
export function applyDiscount(orderItemId: string, type: 'PERCENT' | 'FIXED', value: number, reason: string) {
  return request<Discount>('POST', `/order-items/${orderItemId}/discounts`, { type, value, reason });
}

// ---- Payments (offline-resilient: settling a sale must survive a brief
// connectivity drop too) ----
export interface OptimisticPayment extends Payment {
  pendingSync?: boolean;
}

export async function createPayment(
  orderItemIds: string[],
  method: 'CASH' | 'TRANSFER',
  items: OrderItem[],
): Promise<OptimisticPayment> {
  const body = { orderItemIds, method };
  try {
    return await request<Payment>('POST', '/payments', body);
  } catch (err) {
    if (!(err instanceof NetworkError)) throw err;
    enqueue({ method: 'POST', path: '/payments', body, kind: 'payment' });
    return {
      id: `local-${crypto.randomUUID()}`,
      method,
      amountCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
      orderItems: items,
      pendingSync: true,
    };
  }
}

// ---- Expenses ----
export function createExpense(category: string, amountCents: number, description?: string) {
  return request<Expense>('POST', '/expenses', { category, amountCents, description });
}

export function listExpenses() {
  return request<Expense[]>('GET', '/expenses');
}

// ---- Reports ----
export function getSalesSummary(period: ReportPeriod) {
  return request<SalesSummary>('GET', `/reports/summary?period=${period}`);
}

export function getProductBreakdown(period: ReportPeriod) {
  return request<ProductBreakdownRow[]>('GET', `/reports/products?period=${period}`);
}

export function getWaiterPerformance(period: ReportPeriod) {
  return request<WaiterPerformanceRow[]>('GET', `/reports/waiters?period=${period}`);
}

export function getExpenseBreakdown(period: ReportPeriod) {
  return request<ExpenseBreakdownRow[]>('GET', `/reports/expenses?period=${period}`);
}

export function triggerMonthlySummary() {
  return request<{ sent: number; totalRecipients: number }>('POST', '/reports/monthly-summary/trigger');
}

// ---- Offline outbox flushing ----
export async function flushOutbox(): Promise<number> {
  let flushed = 0;
  for (const item of getQueue()) {
    try {
      await request(item.method, item.path, item.body);
      removeFromQueue(item.id);
      flushed += 1;
    } catch (err) {
      if (err instanceof NetworkError) break; // still offline, stop and retry later
      removeFromQueue(item.id); // server rejected it - drop rather than loop forever
    }
  }
  return flushed;
}
