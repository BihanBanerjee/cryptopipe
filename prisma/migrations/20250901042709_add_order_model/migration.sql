-- CreateEnum
CREATE TYPE "public"."token" AS ENUM ('BTCUSDT', 'SOLUSDT', 'ETHUSDT');

-- CreateEnum
CREATE TYPE "public"."orderStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."position" AS ENUM ('LONG', 'PUT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" INTEGER NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Balance" (
    "id" TEXT NOT NULL,
    "balance" DECIMAL(30,10) NOT NULL DEFAULT 1000,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "orderId" TEXT NOT NULL,
    "status" "public"."orderStatus" NOT NULL,
    "orderType" "public"."position" NOT NULL,
    "asset" "public"."token" NOT NULL,
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "margin" DECIMAL(30,10) NOT NULL,
    "buyPrice" DECIMAL(30,10) NOT NULL,
    "qty" DECIMAL(30,10) NOT NULL,
    "stopLoss" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "takeProfit" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalPnL" DECIMAL(30,10) NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_userId_key" ON "public"."Balance"("userId");

-- AddForeignKey
ALTER TABLE "public"."Balance" ADD CONSTRAINT "Balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
