-- Prevent duplicate live pig tag numbers within the same farm.
CREATE UNIQUE INDEX "Pig_farmId_tagNumber_key" ON "Pig"("farmId", "tagNumber");
