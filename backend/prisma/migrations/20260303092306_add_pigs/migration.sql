-- CreateEnum
CREATE TYPE "PigSex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PigStatus" AS ENUM ('ACTIVE', 'SOLD', 'DEAD');

-- CreateTable
CREATE TABLE "Pig" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "name" TEXT,
    "sex" "PigSex" NOT NULL,
    "breed" TEXT,
    "birthDate" TIMESTAMP(3),
    "status" "PigStatus" NOT NULL DEFAULT 'ACTIVE',
    "sireId" TEXT,
    "damId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pig_farmId_idx" ON "Pig"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "Pig_farmId_tagNumber_key" ON "Pig"("farmId", "tagNumber");

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pig" ADD CONSTRAINT "Pig_damId_fkey" FOREIGN KEY ("damId") REFERENCES "Pig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
