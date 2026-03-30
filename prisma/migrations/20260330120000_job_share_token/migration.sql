-- Job.shareToken for client-only links (nullable, unique when set)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;

-- Unique index matches Prisma @@unique on shareToken (nullable values can repeat in PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS "Job_shareToken_key" ON "Job"("shareToken");
