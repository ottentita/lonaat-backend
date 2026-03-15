-- AlterTable
ALTER TABLE "users" ADD COLUMN     "planId" INTEGER,
ADD COLUMN     "tokenBalance" INTEGER DEFAULT 0;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
