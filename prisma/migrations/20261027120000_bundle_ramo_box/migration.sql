-- Ramo/box armados por la clienta: son Combos con bundleKind (los curados quedan en NULL) y un empaque fijo en Setting.
-- Aditiva: enum nuevo, columna nullable y columna con default; lo existente no cambia.

-- CreateEnum
CREATE TYPE "BundleKind" AS ENUM ('ramo', 'box');

-- AlterTable
ALTER TABLE "Combo" ADD COLUMN "bundleKind" "BundleKind",
ADD COLUMN "packagingFee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "bundlePackagingFee" DECIMAL(12,2) NOT NULL DEFAULT 0;
