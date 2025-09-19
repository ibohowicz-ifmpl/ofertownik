-- CreateTable
CREATE TABLE "public"."OfferCost" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "net" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferCost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."OfferCost" ADD CONSTRAINT "OfferCost_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
