import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { runAbandonedCartJob } from "@/lib/cart/abandoned-job";
import { runOrderExpiryJob } from "@/lib/orders/expiry-job";
import { runShipmentTrackingJob } from "@/lib/shipping/tracking-job";
import { storeWhatsappUrl } from "@/lib/email/whatsapp-url";

export const maxDuration = 60;

/**
 * Cron horario (carrito abandonado + autocancelación de pedidos vencidos + seguimiento de envíos en MiCorreo).
 * Reemplaza el `scheduled()` de Cloudflare Workers (blueprint M4 §9). Disparado
 * por Vercel Cron nativo (`vercel.json`, requiere plan Pro — Hobby limita a
 * 1 corrida/día, insuficiente para la cadencia horaria actual). Vercel agrega
 * automáticamente el header `Authorization: Bearer $CRON_SECRET` cuando esa
 * env var está seteada en el proyecto.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, detail: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://glamifymakeup.site";

  const results = await Promise.allSettled([
    runAbandonedCartJob({ db: prisma as never, sendEmail, now, appUrl }),
    runOrderExpiryJob({ db: prisma as never, now }),
    runShipmentTrackingJob({
      db: prisma as never,
      now,
      sendEmail,
      appUrl,
      ownerEmail: process.env.RESEND_OWNER_EMAIL ?? "",
      getWhatsappUrl: storeWhatsappUrl,
    }),
  ]);

  for (const r of results) if (r.status === "rejected") console.error("[cron]", r.reason);

  const [abandoned, expiry, tracking] = results;
  return NextResponse.json({
    ok: results.every((r) => r.status === "fulfilled"),
    abandoned: abandoned.status === "fulfilled" ? abandoned.value : { error: String(abandoned.reason) },
    expiry: expiry.status === "fulfilled" ? expiry.value : { error: String(expiry.reason) },
    tracking: tracking.status === "fulfilled" ? tracking.value : { error: String(tracking.reason) },
  });
}
