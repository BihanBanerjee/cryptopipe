/*
  Warnings:

  - Added the required column `quantity` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."trades" ADD COLUMN     "quantity" DECIMAL(20,8) NOT NULL;
