ALTER TABLE "UserMPK"
  ALTER COLUMN "mpkId" TYPE uuid USING "mpkId"::uuid;
