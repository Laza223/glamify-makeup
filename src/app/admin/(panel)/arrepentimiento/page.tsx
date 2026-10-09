import { RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { RetractionCard, type RetractionItemView } from "./retraction-card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminArrepentimientoPage() {
  await requireAdmin();
  const rows = await prisma.retractionRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const processedCount = rows.filter((r) => r.status === "processed").length;

  const items: RetractionItemView[] = rows.map((r) => ({
    id: r.id,
    seq: r.seq,
    orderNumber: r.orderNumber,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return (
    <div className="stagger space-y-6">
      <PageHeader
        icon={RotateCcw}
        title="Botón de Arrepentimiento — Solicitudes"
        subtitle="Constancias de revocación de compra emitidas según la Res. 424/2020 (Art. 34 Ley 24.240)."
        action={
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge
                variant="warning"
                className="gap-1.5 px-3 py-1.5 text-xs font-bold"
              >
                <Clock className="size-3.5" aria-hidden />
                {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
              {processedCount} procesadas
            </Badge>
          </div>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <span
            className="icon-medallion mx-auto grid size-14 place-items-center rounded-2xl text-primary"
            aria-hidden
          >
            <RotateCcw className="size-7" />
          </span>
          <p className="mt-4 font-display text-lg font-semibold text-foreground">
            No hay solicitudes de arrepentimiento
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Cuando una clienta complete el formulario de arrepentimiento en la
            web, la constancia va a aparecer acá con todos sus datos de
            contacto.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <RetractionCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
