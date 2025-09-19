/*
  Warnings:

  - You are about to alter the column `name` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.

*/
-- AlterTable
UPDATE "Client" SET "name" = LEFT("name", 10) WHERE char_length("name") > 10;
ALTER TABLE "public"."Client" ALTER COLUMN "name" SET DATA TYPE VARCHAR(10);
