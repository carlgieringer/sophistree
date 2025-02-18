/*
  Warnings:

  - The primary key for the `entities` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "entities" DROP CONSTRAINT "entities_pkey",
ADD CONSTRAINT "entities_pkey" PRIMARY KEY ("id", "mapId");
