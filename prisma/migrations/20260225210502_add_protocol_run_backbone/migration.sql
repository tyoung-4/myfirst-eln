-- CreateTable
CREATE TABLE "ProtocolRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "runBody" TEXT NOT NULL,
    "interactionState" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceEntryId" TEXT NOT NULL,
    "runnerId" TEXT,
    CONSTRAINT "ProtocolRun_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "Entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProtocolRun_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
