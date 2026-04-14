-- CreateTable
CREATE TABLE "FeedUsage" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "feedTypeId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(65,30) NOT NULL,
    "usageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeedUsage" ADD CONSTRAINT "FeedUsage_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedUsage" ADD CONSTRAINT "FeedUsage_feedTypeId_fkey" FOREIGN KEY ("feedTypeId") REFERENCES "FeedType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
