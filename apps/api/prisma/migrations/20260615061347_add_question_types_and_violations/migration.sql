-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_ANSWER';
ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER';
ALTER TYPE "QuestionType" ADD VALUE 'FILL_BLANK';
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "requireSeb" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN     "penaltyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "violationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "violations" JSONB NOT NULL DEFAULT '[]';
