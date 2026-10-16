"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/forms/action-result";

const MAX_AMOUNT = 10_000_000;

export async function updateSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const storeName = String(formData.get("storeName") ?? "").trim();
  const freeShippingThresholdRaw = Number(
    formData.get("freeShippingThreshold") ?? 0,
  );
  const surchargeRaw = String(formData.get("shippingSurcharge") ?? "").trim();
  const shippingSurcharge = surchargeRaw === "" ? 0 : Number(surchargeRaw);
  const originPostalCode = String(
    formData.get("originPostalCode") ?? "",
  ).trim();
  const whatsappNumber =
    String(formData.get("whatsappNumber") ?? "").trim() || null;
  const instagramUrl =
    String(formData.get("instagramUrl") ?? "").trim() || null;
  const tiktokUrl = String(formData.get("tiktokUrl") ?? "").trim() || null;

  if (!storeName) {
    return { ok: false, error: "El nombre de la tienda es obligatorio." };
  }
  if (isNaN(freeShippingThresholdRaw) || freeShippingThresholdRaw < 0) {
    return {
      ok: false,
      error: "El monto de envío gratis debe ser un número positivo.",
    };
  }
  if (
    !Number.isFinite(shippingSurcharge) ||
    shippingSurcharge < 0 ||
    shippingSurcharge > MAX_AMOUNT
  ) {
    return {
      ok: false,
      error: "El recargo de envío debe ser un número entre 0 y 10.000.000.",
    };
  }
  if (!originPostalCode || originPostalCode.length < 4) {
    return {
      ok: false,
      error:
        "El código postal de origen debe tener al menos 4 caracteres (ej. 6700).",
    };
  }

  try {
    await prisma.setting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        storeName,
        freeShippingThreshold: freeShippingThresholdRaw,
        shippingSurcharge,
        originPostalCode,
        whatsappNumber,
        instagramUrl,
        tiktokUrl,
      },
      update: {
        storeName,
        freeShippingThreshold: freeShippingThresholdRaw,
        shippingSurcharge,
        originPostalCode,
        whatsappNumber,
        instagramUrl,
        tiktokUrl,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin/ajustes");
    revalidatePath("/contacto");
    revalidatePath("/tienda");
    revalidatePath("/carrito");
    revalidatePath("/checkout");

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al guardar los ajustes.",
    };
  }
}
