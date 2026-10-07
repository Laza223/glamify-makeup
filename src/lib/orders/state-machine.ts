import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  // paid → shipped directo: cargar el seguimiento no exige marcar "preparando" antes.
  paid: ["preparing", "shipped", "refunded", "cancelled"],
  // → refunded después de enviar: arrepentimiento o devolución (la dueña reembolsa en MP).
  // No repone stock: lo suma ella cuando el producto vuelve en condiciones.
  preparing: ["shipped", "refunded", "cancelled"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/** ¿Es válida la transición de estado de pedido? (blueprint 04 §3) */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Flujo de envío (blueprint 05 §6): pending → ready → dispatched → in_transit → delivered (+returned
 *  desde que ya salió, no antes). `delivered`/`returned` son terminales. Los saltos (pending →
 *  dispatched al cargar el seguimiento, dispatched → delivered si Correo no informó tránsito) los
 *  hace el sistema, no la dueña. */
const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ["ready", "dispatched"],
  ready: ["dispatched"],
  dispatched: ["in_transit", "delivered", "returned"],
  in_transit: ["delivered", "returned"],
  delivered: [],
  returned: [],
};

/** ¿Es válida la transición de estado de envío? El no-op (from === to) siempre es válido. */
export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return true;
  return SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Estado de pedido derivado del estado de pago de MP. `null` = no cambiar el pedido.
 * rejected NO cancela (se permite reintento); el autocancel a 24h lo maneja expiry.ts.
 */
export function orderStatusForPayment(mp: PaymentStatus): OrderStatus | null {
  switch (mp) {
    case "approved": return "paid";
    case "refunded": return "refunded";
    case "cancelled": return "cancelled";
    default: return null; // pending, in_process, rejected
  }
}
