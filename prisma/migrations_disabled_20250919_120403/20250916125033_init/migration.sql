-- CreateEnum
CREATE TYPE "public"."MilestoneStep" AS ENUM ('ZAPYTANIE', 'WYSLANIE', 'AKCEPTACJA_ZLECENIE', 'WYKONANIE', 'PROTOKOL_WYSLANY', 'ODBIOR_PRAC', 'PWF');

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nip" VARCHAR(15),
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "offerNo" TEXT,
    "vendorOrderNo" TEXT,
    "invoiceNo" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "valueNet" DECIMAL(18,2),
    "notes" TEXT,
    "wartoscKosztow" DECIMAL(18,2),
    "zysk" DECIMAL(18,2),
    "marza" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OfferMilestone" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "step" "public"."MilestoneStep" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "offerId" TEXT,
    "docType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileKey" TEXT,
    "checksum" TEXT,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_offerNo_idx" ON "public"."Offer"("offerNo");

-- CreateIndex
CREATE INDEX "Offer_invoiceNo_idx" ON "public"."Offer"("invoiceNo");

-- CreateIndex
CREATE INDEX "OfferMilestone_offerId_occurredAt_idx" ON "public"."OfferMilestone"("offerId", "occurredAt");

-- AddForeignKey
ALTER TABLE "public"."Offer" ADD CONSTRAINT "Offer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferMilestone" ADD CONSTRAINT "OfferMilestone_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
