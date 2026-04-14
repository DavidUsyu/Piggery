/*
  Warnings:

  - You are about to alter the column `quantityBought` on the `FeedPurchase` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantityLeft` on the `FeedPurchase` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `totalCost` on the `FeedPurchase` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "FeedPurchase" ALTER COLUMN "quantityBought" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "quantityLeft" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(65,30);
