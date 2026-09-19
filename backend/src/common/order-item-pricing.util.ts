import { Discount, DiscountType, OrderItem } from '@prisma/client';

/// The amount actually owed for an item: unit price x quantity, minus its
/// discount (if any). v1 allows at most one discount per item (enforced
/// in DiscountsService), so summing is future-proofing, not overreach.
export function orderItemLineTotalCents(item: OrderItem, discounts: Discount[]): number {
  const base = item.unitPriceCents * item.quantity;
  const discountOff = discounts.reduce((total, discount) => {
    const off = discount.type === DiscountType.PERCENT ? Math.round((base * discount.value) / 100) : discount.value;
    return total + off;
  }, 0);
  return Math.max(0, base - discountOff);
}
