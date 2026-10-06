-- Seguimiento automático de envíos (cron que consulta GET /shipping/tracking de MiCorreo).
-- Aditiva: columnas nullables / con default; los envíos existentes quedan sin consultar.
ALTER TABLE "Shipment" ADD COLUMN "trackingLastEvent" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "trackingCheckedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN "trackingNotified" TEXT[] DEFAULT ARRAY[]::TEXT[];
