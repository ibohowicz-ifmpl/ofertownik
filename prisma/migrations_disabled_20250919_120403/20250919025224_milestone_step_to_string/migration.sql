-- === RĘCZNA MIGRACJA: OfferMilestone.step enum → VARCHAR(50) z zachowaniem danych ===

-- 1) Kolumna tymczasowa (tekstowa) na zrzut wartości z enum
ALTER TABLE "OfferMilestone" ADD COLUMN "step_tmp" TEXT;

-- 2) Skopiuj dane (enum::text → step_tmp). Jeżeli kolumna była już tekstem, fallback też zadziała.
DO $$
BEGIN
  BEGIN
    UPDATE "OfferMilestone" SET "step_tmp" = "step"::text;
  EXCEPTION WHEN others THEN
    UPDATE "OfferMilestone" SET "step_tmp" = "step";
  END;
END$$;

-- 3) Usuń indeksy/unikalne klucze, które dotykają starej kolumny "step"
DROP INDEX IF EXISTS "offerId_step";
DROP INDEX IF EXISTS "OfferMilestone_offerId_step_key";
DROP INDEX IF EXISTS "OfferMilestone_offerId_idx";

-- 4) Usuń starą kolumnę
ALTER TABLE "OfferMilestone" DROP COLUMN "step";

-- 5) Dodaj nową kolumnę jako NULLABLE (to kluczowa zmiana!)
ALTER TABLE "OfferMilestone" ADD COLUMN "step" VARCHAR(50);

-- 6) Przenieś dane ze "step_tmp" do nowej kolumny (ustal wartość domyślną dla ewentualnych NULL-i)
UPDATE "OfferMilestone" SET "step" = COALESCE("step_tmp", 'UNKNOWN');

-- 7) Ustaw NOT NULL dopiero PO zapełnieniu danych
ALTER TABLE "OfferMilestone" ALTER COLUMN "step" SET NOT NULL;

-- 8) Usuń kolumnę tymczasową
ALTER TABLE "OfferMilestone" DROP COLUMN "step_tmp";

-- 9) Odtwórz indeksy
CREATE UNIQUE INDEX IF NOT EXISTS "offerId_step" ON "OfferMilestone" ("offerId","step");
CREATE INDEX IF NOT EXISTS "OfferMilestone_offerId_idx" ON "OfferMilestone" ("offerId");
