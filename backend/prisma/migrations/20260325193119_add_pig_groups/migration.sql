-- AlterTable
ALTER TABLE "Pig" ADD COLUMN     "pigGroupId" TEXT;

-- CreateTable
CREATE TABLE "PigGroup" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PigGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PigGroup_farmId_idx" ON "PigGroup"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "PigGroup_farmId_name_key" ON "PigGroup"("farmId", "name");

-- CreateIndex
CREATE INDEX "Pig_pigGroupId_idx" ON "Pig"("pigGroupId");

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_pigGroupId_fkey" FOREIGN KEY ("pigGroupId") REFERENCES "PigGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PigGroup" ADD CONSTRAINT "PigGroup_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
