-- CreateEnum
CREATE TYPE "PregnancyStatus" AS ENUM ('NOT_PREGNANT', 'PREGNANT', 'RETURNED_TO_HEAT');

-- CreateEnum
CREATE TYPE "PregnancyCheckResult" AS ENUM ('PREGNANT', 'RETURNED_TO_HEAT');

-- DropForeignKey
ALTER TABLE "Pig" DROP CONSTRAINT "Pig_damId_fkey";

-- DropForeignKey
ALTER TABLE "Pig" DROP CONSTRAINT "Pig_sireId_fkey";

-- DropIndex
DROP INDEX "Pig_farmId_tagNumber_key";

-- AlterTable
ALTER TABLE "Pig" ADD COLUMN     "pregnancyStatus" "PregnancyStatus" NOT NULL DEFAULT 'NOT_PREGNANT';

-- AlterTable
ALTER TABLE "PigEvent" ADD COLUMN     "pregnancyCheckResult" "PregnancyCheckResult";
