-- Replace PaymentMethod's TRANSFER with NEQUI and DAVIPLATA (Colombian
-- digital wallets, more relevant to how this bakery actually gets paid
-- than a generic "bank transfer"). Postgres has no built-in way to
-- remove an enum value, so this recreates the type and remaps any
-- existing TRANSFER rows to DAVIPLATA rather than assuming none exist.

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'NEQUI', 'DAVIPLATA');

ALTER TABLE "payments" ALTER COLUMN "method" DROP DEFAULT;

ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod" USING (
  CASE "method"::text
    WHEN 'TRANSFER' THEN 'DAVIPLATA'
    ELSE "method"::text
  END
)::"PaymentMethod";

DROP TYPE "PaymentMethod_old";
