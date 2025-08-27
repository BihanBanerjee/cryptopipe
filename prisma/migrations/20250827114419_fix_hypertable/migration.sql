/*
  Warnings:

  - The primary key for the `trades` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "public"."trades" DROP CONSTRAINT "trades_pkey",
ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id", "time");
