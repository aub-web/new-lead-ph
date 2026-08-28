-- DropTable
DROP TABLE "SyncState";

-- CreateTable
CREATE TABLE "TabSyncState" (
    "tabTitle" TEXT NOT NULL,
    "lastRowNumber" INTEGER NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,

    CONSTRAINT "TabSyncState_pkey" PRIMARY KEY ("tabTitle")
);
