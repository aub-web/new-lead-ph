-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "isBackfill" BOOLEAN NOT NULL DEFAULT false;
