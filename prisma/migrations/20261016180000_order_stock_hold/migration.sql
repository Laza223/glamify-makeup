-- Reserva blanda de stock: un pedido pendiente retiene sus unidades hasta "reservedUntil" (30 min) para
-- que dos personas no paguen la misma última unidad. El stock se sigue descontando en el webhook.
-- Aditiva: columna nullable (los pedidos existentes no retienen nada).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "reservedUntil" TIMESTAMP(3);
