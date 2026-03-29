/*
  Warnings:

  - A unique constraint covering the columns `[eventId]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "eventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_eventId_key" ON "Expense"("eventId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PigEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
