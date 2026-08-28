-- DropIndex
DROP INDEX "Lead_rowNumber_key";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "tabTitle" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tabTitle_rowNumber_key" ON "Lead"("tabTitle", "rowNumber");

-- AlterTable: drop the temporary default now that existing (zero) rows are backfilled
ALTER TABLE "Lead" ALTER COLUMN "tabTitle" DROP DEFAULT;
