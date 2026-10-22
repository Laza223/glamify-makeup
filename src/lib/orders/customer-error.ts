/** Error cuyo mensaje está escrito para la clienta: las acciones lo muestran tal cual. */
export class CustomerFacingError extends Error {
  override name = "CustomerFacingError";
}

/** El cupón del carrito dejó de valer al pagar: la acción lo saca del carrito para que la clienta pueda reintentar. */
export class CouponRejectedError extends CustomerFacingError {
  override name = "CouponRejectedError";
}

/**
 * Mensaje para la clienta de una acción cualquiera (carrito, cuenta): solo pasan los `CustomerFacingError`;
 * lo técnico (Prisma, Supabase, runtime) se loguea y se reemplaza por `fallback`.
 */
export function customerErrorMessage(e: unknown, context: string, fallback: string): string {
  if (e instanceof CustomerFacingError) return e.message;
  console.error(`[${context}]`, e);
  return fallback;
}

/**
 * Mensaje para la clienta cuando falla iniciar un pago. Solo pasan los mensajes escritos para ella;
 * cualquier otro (respuesta cruda de MP, Prisma) se loguea y se reemplaza por uno genérico.
 */
export function paymentErrorMessage(e: unknown, context: string): string {
  if (e instanceof CustomerFacingError) return e.message;
  // AbortSignal.timeout() en mercadopago.ts tira un DOMException técnico en inglés.
  if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
    return "No pudimos conectar con Mercado Pago. Probá de nuevo en unos segundos.";
  }
  console.error(`[${context}]`, e);
  return "No pudimos iniciar el pago. Probá de nuevo en unos segundos.";
}
