"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminResult } from "@/lib/admin/result";
import { changeOrderStatus, cancelOrder, defaultOrdersDeps } from "@/lib/admin/orders/service";
import { resendGiftCardEmail, defaultGiftCardMailDeps } from "@/lib/admin/orders/gift-cards";
import { upsertShipment, resendDispatchEmail, defaultShipmentsDeps } from "@/lib/admin/shipments/service";
import type { OrderStatus } from "@prisma/client";

/** Aviso cuando el pedido tenía gift cards ya usadas: no se pueden anular. */
function usedGiftCardsWarning(used: number): string | undefined {
  if (used === 0) return undefined;
  return used === 1
    ? "Una gift card de este pedido ya estaba usada: no se pudo anular."
    : `${used} gift cards de este pedido ya estaban usadas: no se pudieron anular.`;
}

export async function changeOrderStatusAction(orderId: string, to: OrderStatus): Promise<AdminResult> {
  try {
    await requireAdmin();
    const r = await changeOrderStatus(orderId, to, defaultOrdersDeps());
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return { ok: true, id: r.id, warning: usedGiftCardsWarning(r.giftCardsUsed) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cambiar el estado del pedido." };
  }
}

export async function cancelOrderAction(orderId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    const r = await cancelOrder(orderId, defaultOrdersDeps());
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return { ok: true, id: r.id, warning: usedGiftCardsWarning(r.giftCardsUsed) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cancelar el pedido." };
  }
}

/** Despacho manual: empresa + código. El pedido pasa a Enviado y se avisa a la clienta. */
export async function upsertShipmentAction(
  orderId: string,
  input: { carrier: string; trackingNumber: string; pickupBranch?: string },
): Promise<AdminResult> {
  try {
    await requireAdmin();
    const r = await upsertShipment(orderId, input, defaultShipmentsDeps());
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return { ok: true, id: r.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar el envío." };
  }
}

/** Reenvía a la clienta el mail de despacho con los datos ya guardados. */
export async function resendDispatchEmailAction(orderId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    await resendDispatchEmail(orderId, defaultShipmentsDeps());
    return { ok: true, id: orderId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo reenviar el mail." };
  }
}

/** Reenvía a la clienta el mail con sus gift cards sin usar. */
export async function resendGiftCardEmailAction(orderId: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    await resendGiftCardEmail(orderId, defaultGiftCardMailDeps());
    return { ok: true, id: orderId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo reenviar el mail." };
  }
}
