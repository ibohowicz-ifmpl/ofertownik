-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN     "offerMonth" VARCHAR(7);

-- CreateIndex
CREATE INDEX "Offer_offerMonth_idx" ON "public"."Offer"("offerMonth");
