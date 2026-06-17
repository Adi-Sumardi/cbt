-- AlterTable: add nis to User (optional, so no default needed)
ALTER TABLE "User" ADD COLUMN "nis" TEXT;

-- AlterTable: add accessCode to Exam with a temporary default for existing rows
ALTER TABLE "Exam" ADD COLUMN "accessCode" TEXT;

-- Backfill existing rows with a unique random-ish code derived from their id
UPDATE "Exam" SET "accessCode" = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)) WHERE "accessCode" IS NULL;

-- Now enforce NOT NULL and UNIQUE
ALTER TABLE "Exam" ALTER COLUMN "accessCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_nis_key" ON "User"("nis");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_accessCode_key" ON "Exam"("accessCode");
