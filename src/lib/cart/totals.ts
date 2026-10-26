import { round2 } from "@/lib/money";
import type { CartLine } from "@/lib/cart/types";

/** Total de una línea: precio unitario × cantidad, redondeado a 2 decimales. */
export function lineTotal(line: CartLine): number {
  return round2(line.unitPrice * line.qty);
}

/** Parte del total de una línea que no es empaque (base de cupones y envío gratis). */
export function merchandiseTotal(line: CartLine): number {
  return round2(lineTotal(line) - (line.packagingFee ?? 0) * line.qty);
}

/** Subtotal del carrito: suma de los totales de línea. */
export function cartSubtotal(lines: CartLine[]): number {
  return round2(lines.reduce((acc, l) => acc + lineTotal(l), 0));
}

/** Subtotal de las líneas físicas (sin gift cards): base del umbral de envío gratis. */
export function physicalSubtotal(lines: CartLine[]): number {
  return round2(lines.filter((l) => !l.isGiftCard).reduce((acc, l) => acc + merchandiseTotal(l), 0));
}

/** true si el carrito tiene líneas y TODAS son gift cards (pedido digital: sin dirección ni envío). */
export function isDigitalOnly(lines: CartLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.isGiftCard);
}

/** Cantidad total de ítems (para el badge del carrito). */
export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((acc, l) => acc + l.qty, 0);
}
