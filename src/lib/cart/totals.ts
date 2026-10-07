import { round2 } from "@/lib/money";
import type { CartLine } from "@/lib/cart/types";

/** Total de una línea: precio unitario × cantidad, redondeado a 2 decimales. */
export function lineTotal(line: CartLine): number {
  return round2(line.unitPrice * line.qty);
}

/** Subtotal del carrito: suma de los totales de línea. */
export function cartSubtotal(lines: CartLine[]): number {
  return round2(lines.reduce((acc, l) => acc + lineTotal(l), 0));
}

/** Subtotal de las líneas físicas (sin gift cards): base del umbral de envío gratis. */
export function physicalSubtotal(lines: CartLine[]): number {
  return cartSubtotal(lines.filter((l) => !l.isGiftCard));
}

/** true si el carrito tiene líneas y TODAS son gift cards (pedido digital: sin dirección ni envío). */
export function isDigitalOnly(lines: CartLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.isGiftCard);
}

/** Cantidad total de ítems (para el badge del carrito). */
export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((acc, l) => acc + l.qty, 0);
}
