WITH dups AS (
  SELECT "id", "nip",
         ROW_NUMBER() OVER (PARTITION BY "nip" ORDER BY "id") AS rn
  FROM "Client"
)
UPDATE "Client" c
SET "nip" = c."nip" || '-DUP-' || SUBSTRING(c."id"::text, 1, 6)
FROM dups d
WHERE c."id" = d."id"
  AND d.rn > 1;
