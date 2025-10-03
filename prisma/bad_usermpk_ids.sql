SELECT "mpkId"
FROM "UserMPK"
WHERE "mpkId" IS NOT NULL
  AND "mpkId" !~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
LIMIT 10;
