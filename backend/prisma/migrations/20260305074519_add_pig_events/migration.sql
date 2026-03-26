-- CreateEnum
CREATE TYPE "PigEventType" AS ENUM ('WEIGHT', 'VACCINATION', 'DEWORMING', 'HEAT', 'MATING', 'FARROWING', 'WEANING', 'ILLNESS', 'TREATMENT', 'SALE', 'DEATH', 'NOTE');

-- CreateTable
CREATE TABLE "PigEvent" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "pigId" TEXT NOT NULL,
    "type" "PigEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "medicine" TEXT,
    "dose" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PigEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PigEvent_farmId_pigId_idx" ON "PigEvent"("farmId", "pigId");

-- CreateIndex
CREATE INDEX "PigEvent_eventDate_idx" ON "PigEvent"("eventDate");

-- AddForeignKey
ALTER TABLE "PigEvent" ADD CONSTRAINT "PigEvent_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigEvent" ADD CONSTRAINT "PigEvent_pigId_fkey" FOREIGN KEY ("pigId") REFERENCES "Pig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
