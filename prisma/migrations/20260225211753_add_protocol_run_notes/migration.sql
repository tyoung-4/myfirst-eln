-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProtocolRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "runBody" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "interactionState" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sourceEntryId" TEXT NOT NULL,
    "runnerId" TEXT,
    CONSTRAINT "ProtocolRun_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "Entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProtocolRun_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProtocolRun" ("createdAt", "id", "interactionState", "locked", "runBody", "runnerId", "sourceEntryId", "status", "title", "updatedAt") SELECT "createdAt", "id", "interactionState", "locked", "runBody", "runnerId", "sourceEntryId", "status", "title", "updatedAt" FROM "ProtocolRun";
DROP TABLE "ProtocolRun";
ALTER TABLE "new_ProtocolRun" RENAME TO "ProtocolRun";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
