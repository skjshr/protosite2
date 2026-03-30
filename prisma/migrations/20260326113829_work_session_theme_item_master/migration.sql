/*
  Warnings:

  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `theme` on the `Field` table. All the data in the column will be lost.
  - Added the required column `themeId` to the `Field` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Session_fieldId_endedAt_idx";

-- DropIndex
DROP INDEX "Session_userId_endedAt_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Session";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "WorkSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "pausedAt" DATETIME,
    "endedAt" DATETIME NOT NULL,
    "pauseAccumulatedSeconds" INTEGER NOT NULL,
    "effectiveSeconds" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkSession_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ThemeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "themeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "dropWeight" REAL,
    "unlockLevel" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ThemeItem_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThemeItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquiredWorkSessionId" TEXT,
    CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserItem_acquiredWorkSessionId_fkey" FOREIGN KEY ("acquiredWorkSessionId") REFERENCES "WorkSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Field" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalEffectiveSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Field_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Field_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Field" ("createdAt", "id", "isPublic", "name", "totalEffectiveSeconds", "totalSessions", "updatedAt", "userId") SELECT "createdAt", "id", "isPublic", "name", "totalEffectiveSeconds", "totalSessions", "updatedAt", "userId" FROM "Field";
DROP TABLE "Field";
ALTER TABLE "new_Field" RENAME TO "Field";
CREATE INDEX "Field_userId_idx" ON "Field"("userId");
CREATE INDEX "Field_themeId_idx" ON "Field"("themeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WorkSession_userId_endedAt_idx" ON "WorkSession"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "WorkSession_fieldId_endedAt_idx" ON "WorkSession"("fieldId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_key_key" ON "Theme"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Item_key_key" ON "Item"("key");

-- CreateIndex
CREATE INDEX "ThemeItem_themeId_idx" ON "ThemeItem"("themeId");

-- CreateIndex
CREATE INDEX "ThemeItem_itemId_idx" ON "ThemeItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeItem_themeId_itemId_key" ON "ThemeItem"("themeId", "itemId");

-- CreateIndex
CREATE INDEX "UserItem_userId_idx" ON "UserItem"("userId");

-- CreateIndex
CREATE INDEX "UserItem_itemId_idx" ON "UserItem"("itemId");

-- CreateIndex
CREATE INDEX "UserItem_acquiredWorkSessionId_idx" ON "UserItem"("acquiredWorkSessionId");
