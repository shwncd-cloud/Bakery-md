-- Custom orders no longer reference an existing catalog Product - a
-- one-off custom cake often isn't (and doesn't need to be) a menu item.
-- Add the free-text column, backfill it from the linked product's name
-- for any existing rows, then drop the old foreign key and column.

-- AddColumn
ALTER TABLE "custom_orders" ADD COLUMN "productName" TEXT;

-- Backfill from the current catalog product name before the link is dropped
UPDATE "custom_orders" co
SET "productName" = p."name"
FROM "products" p
WHERE co."productId" = p."id";

-- Make the backfilled column required
ALTER TABLE "custom_orders" ALTER COLUMN "productName" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "custom_orders" DROP CONSTRAINT "custom_orders_productId_fkey";

-- DropColumn
ALTER TABLE "custom_orders" DROP COLUMN "productId";
