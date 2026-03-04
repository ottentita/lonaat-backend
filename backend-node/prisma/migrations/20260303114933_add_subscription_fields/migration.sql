/*
  Warnings:

  - Made the column `tokenBalance` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ALTER COLUMN "tokenBalance" SET NOT NULL;
