"use client";

import { useTransition } from "react";
import { formatRetractionTicket } from "@/lib/legal/retraction/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Mail,
  Phone,
  MessageCircle,
  CalendarDays,
  ShoppingBag,
  Check,
  X,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { updateRetractionStatusAction } from "./actions";
import type { RetractionStatus } from "@prisma/client";

export interface RetractionItemView {
  id: string;
  seq: number;
  orderNumber: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  reason: string | null;
  status: RetractionStatus;
  createdAt: Date;
}

export function RetractionCard({ item }: { item: RetractionItemView }) {
  const [pending, startTransition] = useTransition();
  const ticket = formatRetractionTicket(item.seq);

  const cleanPhone = item.contactPhone?.replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `¡Hola ${item.contactName}! Te escribo de Glamify Makeup por tu solicitud de arrepentimiento (${ticket}).`,
      )}`
    : null;

  function setStatus(next: RetractionStatus) {
    startTransition(async () => {
      await updateRetractionStatusAction({ id: item.id, status: next });
    });
  }

  return (
    <div className="admin-card flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
      {/* Cabecera: Ticket + Estado */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface-alt/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-4" aria-hidden />
          </span>
          <div>
            <span className="font-mono text-sm font-bold tracking-wider text-foreground">
              {ticket}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="size-3" aria-hidden />
              <span>{item.createdAt.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
              <span>·</span>
              <span>
                {item.createdAt.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                  timeZone: "America/Argentina/Buenos_Aires",
                })}
              </span>
            </div>
          </div>
        </div>

        <div>
          {item.status === "pending" && (
            <Badge variant="warning" className="gap-1 text-xs font-semibold">
              Pendiente
            </Badge>
          )}
          {item.status === "processed" && (
            <Badge variant="success" className="gap-1 text-xs font-semibold">
              <Check className="size-3 stroke-[3]" />
              Procesada
            </Badge>
          )}
          {item.status === "rejected" && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs font-semibold text-muted-foreground"
            >
              <X className="size-3 stroke-[3]" />
              Rechazada
            </Badge>
          )}
        </div>
      </div>

      {/* Contenido: Datos del contacto y pedido */}
      <div className="flex-1 space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Clienta
          </p>
          <p className="text-sm font-bold text-foreground">
            {item.contactName}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
          <a
            href={`mailto:${item.contactEmail}?subject=${encodeURIComponent(`Glamify Makeup — Solicitud ${ticket}`)}`}
            className="flex items-center gap-2 truncate rounded-xl border border-border/60 bg-surface-alt px-3 py-2 text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Mail className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.contactEmail}</span>
          </a>

          {item.contactPhone ? (
            <div className="flex items-center gap-1">
              <a
                href={`tel:${item.contactPhone}`}
                className="flex flex-1 items-center gap-2 truncate rounded-xl border border-border/60 bg-surface-alt px-3 py-2 text-foreground/80 transition-colors hover:text-primary"
              >
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{item.contactPhone}</span>
              </a>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Escribir por WhatsApp"
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                >
                  <MessageCircle className="size-4" />
                </a>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2 italic text-muted-foreground">
              Sin teléfono
            </span>
          )}
        </div>

        {item.orderNumber && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground">Nº de pedido:</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 font-mono font-bold text-foreground">
              <ShoppingBag className="size-3 text-primary" />
              {item.orderNumber}
            </span>
          </div>
        )}

        {item.reason && (
          <div className="rounded-xl border border-border/60 bg-surface-alt/40 p-3 text-xs">
            <p className="mb-1 font-semibold text-muted-foreground">
              Motivo manifestado:
            </p>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              {item.reason}
            </p>
          </div>
        )}
      </div>

      {/* Pie de acciones */}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-surface-alt/30 px-5 py-3 text-xs">
        <span className="text-[11px] text-muted-foreground">
          {pending ? "Actualizando estado…" : "Cambiar estado:"}
        </span>

        <div className="flex items-center gap-2">
          {item.status !== "processed" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setStatus("processed")}
              className="gap-1 rounded-xl text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3 stroke-[3]" />
              )}
              <span>Procesada</span>
            </Button>
          )}

          {item.status !== "rejected" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setStatus("rejected")}
              className="gap-1 rounded-xl text-xs font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-50"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3 stroke-[3]" />
              )}
              <span>Rechazar</span>
            </Button>
          )}

          {item.status !== "pending" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setStatus("pending")}
              className="gap-1 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              <span>Pendiente</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
