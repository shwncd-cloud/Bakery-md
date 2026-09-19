-- Rename category to provider (existing values are preserved as-is - a
-- plain column rename, no data transformation needed), and add the
-- optional voucher number field.
ALTER TABLE "expenses" RENAME COLUMN "category" TO "provider";
ALTER TABLE "expenses" ADD COLUMN "voucherNumber" TEXT;
