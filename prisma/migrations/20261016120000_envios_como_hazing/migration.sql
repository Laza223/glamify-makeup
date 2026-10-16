-- Envíos como Hazing: despacho manual multi-empresa + recargo de envío editable. Aditiva.
ALTER TYPE "ShipmentCarrier" ADD VALUE IF NOT EXISTS 'andreani';
ALTER TYPE "ShipmentCarrier" ADD VALUE IF NOT EXISTS 'oca';
ALTER TYPE "ShipmentCarrier" ADD VALUE IF NOT EXISTS 'via_cargo';

ALTER TABLE "Setting" ADD COLUMN "shippingSurcharge" DECIMAL(12,2) NOT NULL DEFAULT 0;
