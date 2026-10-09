import { Settings } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "./settings-form";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminAjustesPage() {
  await requireAdmin();
  const setting = await prisma.setting.findUnique({
    where: { id: "default" },
  });

  const initialSettings = {
    storeName: setting?.storeName ?? "Glamify Makeup",
    freeShippingThreshold: setting
      ? Number(setting.freeShippingThreshold)
      : 47500,
    originPostalCode: setting?.originPostalCode ?? "6700",
    whatsappNumber: setting?.whatsappNumber ?? null,
    instagramUrl: setting?.instagramUrl ?? null,
    tiktokUrl: setting?.tiktokUrl ?? null,
  };

  return (
    <div className="stagger space-y-6">
      <PageHeader
        icon={Settings}
        title="Ajustes de la Tienda"
        subtitle="Configurá los datos generales de la tienda, umbral de envío gratis y canales de atención."
      />

      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
