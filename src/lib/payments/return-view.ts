/**
 * Qué mostrar cuando la clienta vuelve de Mercado Pago a /checkout/gracias.
 * `mpStatus` es el `collection_status` que MP agrega a la back_url: solo decide la UI, nunca el estado del pedido
 * (eso lo hace el webhook, que re-consulta el pago).
 */
export type ReturnView = "paid" | "approved_pending" | "confirming" | "retry" | "closed";

const PAID = new Set(["paid", "preparing", "shipped", "delivered"]);

export function paymentReturnView(orderStatus: string, mpStatus: string | undefined): ReturnView {
  if (PAID.has(orderStatus)) return "paid";
  if (orderStatus !== "pending_payment") return "closed";
  // MP ya cobró y el webhook todavía no llegó: ofrecer "Pagar ahora" acá provoca dobles pagos.
  if (mpStatus === "approved") return "approved_pending";
  if (mpStatus === "in_process" || mpStatus === "pending") return "confirming";
  return "retry";
}
