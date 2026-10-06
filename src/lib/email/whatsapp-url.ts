import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/whatsapp";

/**
 * Link de WhatsApp de la tienda para los mails a las clientas, con el número que la dueña
 * carga en el panel (`Setting.whatsappNumber`). Best-effort: si no hay número o falla la DB,
 * devuelve null y el mail sale igual, sin link.
 */
export async function storeWhatsappUrl(message?: string): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "default" }, select: { whatsappNumber: true } });
    return whatsappLink(setting?.whatsappNumber, message);
  } catch {
    return null;
  }
}
