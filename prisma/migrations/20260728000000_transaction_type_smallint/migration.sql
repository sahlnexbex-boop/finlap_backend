ALTER TABLE "Transaction"
ALTER COLUMN "type" TYPE SMALLINT
USING CASE
  WHEN "type" IN ('INCOME', '1') THEN 1
  ELSE 0
END;

ALTER TABLE "Wallet"
ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'user-julian';

ALTER TABLE "Budget"
ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'user-julian';

ALTER TABLE "Goal"
ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'user-julian';

ALTER TABLE "NetWorthHistory"
ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'user-julian';

DROP INDEX IF EXISTS "Budget_category_key";

CREATE UNIQUE INDEX "Budget_userId_category_key" ON "Budget"("userId", "category");

ALTER TABLE "Transaction"
RENAME COLUMN "attachmentUrl" TO "attachment";

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "password" TEXT;

UPDATE "User"
SET "id" = '00000000-0000-4000-8000-000000000001'
WHERE "id" = 'user-julian';

UPDATE "Wallet"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "Budget"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "Goal"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "NetWorthHistory"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "Transaction"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "BusinessEntity"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "Account"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

UPDATE "Category"
SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "userId" = 'user-julian';

ALTER TABLE "Wallet" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Budget" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Goal" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "NetWorthHistory" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "userId" DROP DEFAULT;
