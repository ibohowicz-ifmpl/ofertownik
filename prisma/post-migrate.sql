-- 1. Backfill Offer.mpkId na podstawie prefiksu offerNo (pierwsze 3 znaki = MPK.code3)
UPDATE "Offer" o
SET "mpkId" = m."id"::uuid
FROM "MPK" m
WHERE o."mpkId" IS NULL
  AND SUBSTRING(o."offerNo", 1, 3) = TRIM(BOTH FROM m."code3");

-- 2. Funkcja sumująca koszty do Offer.costsSumNet
CREATE OR REPLACE FUNCTION update_offer_costs_sum() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Offer"
  SET "costsSumNet" = COALESCE((
    SELECT SUM("amountNet") FROM "OfferCost" WHERE "offerId" = NEW."offerId"
  ), 0)
  WHERE "id" = NEW."offerId";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger na INSERT/UPDATE/DELETE w OfferCost
DROP TRIGGER IF EXISTS offer_costs_sum_insert ON "OfferCost";
DROP TRIGGER IF EXISTS offer_costs_sum_update ON "OfferCost";
DROP TRIGGER IF EXISTS offer_costs_sum_delete ON "OfferCost";

CREATE TRIGGER offer_costs_sum_insert
AFTER INSERT ON "OfferCost"
FOR EACH ROW EXECUTE FUNCTION update_offer_costs_sum();

CREATE TRIGGER offer_costs_sum_update
AFTER UPDATE ON "OfferCost"
FOR EACH ROW EXECUTE FUNCTION update_offer_costs_sum();

CREATE TRIGGER offer_costs_sum_delete
AFTER DELETE ON "OfferCost"
FOR EACH ROW EXECUTE FUNCTION update_offer_costs_sum();
