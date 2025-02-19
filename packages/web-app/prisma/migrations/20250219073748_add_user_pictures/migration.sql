/*
  Warnings:

  - A unique constraint covering the columns `[authExternalId,authProvider]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_authExternalId_authProvider_idx";

-- DropIndex
DROP INDEX "users_authExternalId_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pictureUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_authExternalId_authProvider_key" ON "users"("authExternalId", "authProvider");
