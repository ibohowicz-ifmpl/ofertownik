CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "MPK"
  ALTER COLUMN "id" TYPE uuid USING "id"::uuid;

-- (opcjonalnie) ustaw domy?ln? warto?? po stronie DB
-- je?li wolisz pgcrypto: gen_random_uuid(), wtedy najpierw CREATE EXTENSION "pgcrypto";
ALTER TABLE "MPK"
  ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
