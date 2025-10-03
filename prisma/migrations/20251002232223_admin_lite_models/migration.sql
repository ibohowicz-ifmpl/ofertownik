-- AlterTable
ALTER TABLE "public"."Offer" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);
