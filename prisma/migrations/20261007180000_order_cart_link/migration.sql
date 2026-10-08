-- El carrito sigue activo hasta que el pago se aprueba: el pedido guarda de qué carrito salió para que
-- el webhook lo marque `ordered` al pagarse y para cancelar el pendiente anterior si la clienta reintenta.
-- Aditiva: columna nullable (los pedidos existentes quedan sin carrito vinculado).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "cartId" UUID;

-- CreateIndex
CREATE INDEX "Order_cartId_idx" ON "Order"("cartId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
