ALTER TABLE "ClientMPK"
  ALTER COLUMN "mpkId" TYPE uuid USING "mpkId"::uuid;
