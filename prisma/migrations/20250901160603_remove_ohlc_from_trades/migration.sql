/*
  Warnings:

  - You are about to drop the column `close` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `high` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `low` on the `trades` table. All the data in the column will be lost.
  - You are about to drop the column `open` on the `trades` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."trades" DROP COLUMN "close",
DROP COLUMN "high",
DROP COLUMN "low",
DROP COLUMN "open";
