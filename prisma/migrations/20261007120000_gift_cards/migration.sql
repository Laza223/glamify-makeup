-- Gift Card digital: pedidos sin envío, líneas que emiten cupón y cupones con pedido de origen.
-- Aditiva: valor de enum nuevo, columna con default y columna nullable; lo existente no cambia.
-- El valor 'digital' no se usa dentro de esta migración (Postgres no lo permite en la misma tx).

-- AlterEnum
ALTER TYPE "ShippingMethod" ADD VALUE 'digital';

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN "sourceOrderId" UUID;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "isGiftCard" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Coupon_sourceOrderId_idx" ON "Coupon"("sourceOrderId");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
