-- CreateTable
CREATE TABLE "token_packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenAmount" INTEGER NOT NULL,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_packs_pkey" PRIMARY KEY ("id")
);
