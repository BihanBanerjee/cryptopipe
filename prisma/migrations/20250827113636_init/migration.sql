-- CreateTable
CREATE TABLE "public"."trades" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMPTZ NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "high" DECIMAL(20,8),
    "low" DECIMAL(20,8),
    "open" DECIMAL(20,8),
    "close" DECIMAL(20,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trades_symbol_time_idx" ON "public"."trades"("symbol", "time");

-- CreateIndex
CREATE INDEX "trades_time_idx" ON "public"."trades"("time");
