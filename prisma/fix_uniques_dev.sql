-- Client: zostaw 1 rekord na NIP, reszcie dopisz sufiks
WITH d AS (
  SELECT "id","nip", ROW_NUMBER() OVER (PARTITION BY "nip" ORDER BY "id") rn
  FROM "Client"
)
UPDATE "Client" c
SET "nip" = c."nip" || '-DUP-' || SUBSTRING(c."id"::text, 1, 6)
FROM d
WHERE c."id" = d."id" AND d.rn > 1;

-- Offer: zostaw 1 rekord na offerNo, reszcie dopisz sufiks
WITH d AS (
  SELECT "id","offerNo", ROW_NUMBER() OVER (PARTITION BY "offerNo" ORDER BY "id") rn
  FROM "Offer" WHERE "offerNo" IS NOT NULL
)
UPDATE "Offer" o
SET "offerNo" = o."offerNo" || '-DUP-' || SUBSTRING(o."id"::text, 1, 6)
FROM d
WHERE o."id" = d."id" AND d.rn > 1;

-- OfferMilestone: zostaw najstarszy per (offerId, step), usu? reszt?
WITH d AS (
  SELECT "id","offerId","step",
         ROW_NUMBER() OVER (PARTITION BY "offerId","step" ORDER BY "occurredAt" NULLS LAST, "id") rn
  FROM "OfferMilestone"
)
DELETE FROM "OfferMilestone" m
USING d
WHERE m."id" = d."id" AND d.rn > 1;
