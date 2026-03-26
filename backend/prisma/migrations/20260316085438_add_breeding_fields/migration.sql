/*
  Warnings:

  - The values [HEAT,MATING] on the enum `PigEventType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PigEventType_new" AS ENUM ('WEIGHT', 'VACCINATION', 'DEWORMING', 'BREEDING', 'FARROWING', 'WEANING', 'ILLNESS', 'TREATMENT', 'SALE', 'DEATH', 'NOTE');
ALTER TABLE "PigEvent" ALTER COLUMN "type" TYPE "PigEventType_new" USING ("type"::text::"PigEventType_new");
ALTER TYPE "PigEventType" RENAME TO "PigEventType_old";
ALTER TYPE "PigEventType_new" RENAME TO "PigEventType";
DROP TYPE "public"."PigEventType_old";
COMMIT;

-- AlterTable
ALTER TABLE "PigEvent" ADD COLUMN     "boarId" TEXT,
ADD COLUMN     "pigletsBorn" INTEGER,
ADD COLUMN     "stillBorn" INTEGER;
