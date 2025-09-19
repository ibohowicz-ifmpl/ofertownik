/*
  Warnings:

  - You are about to drop the column `net` on the `OfferCost` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `OfferCost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valueNet` to the `OfferCost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."OfferCost" DROP COLUMN "net",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "valueNet" DECIMAL(14,2) NOT NULL;

-- CreateIndex
CREATE INDEX "OfferCost_offerId_idx" ON "public"."OfferCost"("offerId");
