-- Client.nip
SELECT "nip", COUNT(*) AS cnt
FROM "Client"
GROUP BY "nip"
HAVING COUNT(*) > 1;

-- Offer.offerNo
SELECT "offerNo", COUNT(*) AS cnt
FROM "Offer"
WHERE "offerNo" IS NOT NULL
GROUP BY "offerNo"
HAVING COUNT(*) > 1;

-- OfferMilestone (offerId, step)
SELECT "offerId","step", COUNT(*) AS cnt
FROM "OfferMilestone"
GROUP BY "offerId","step"
HAVING COUNT(*) > 1;
