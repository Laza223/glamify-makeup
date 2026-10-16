import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; tone: string }> = {
  pending_payment: { label: "Pago pendiente", tone: "bg-[#FFF4D6] text-[#7A5200]" },
  paid: { label: "Pagado", tone: "bg-secondary text-accent" },
  preparing: { label: "Preparando", tone: "bg-secondary text-accent" },
  shipped: { label: "Enviado", tone: "bg-[#E7F5EE] text-[#0E6B45]" },
  delivered: { label: "Entregado", tone: "bg-[#E7F5EE] text-[#0E6B45]" },
  cancelled: { label: "Cancelado", tone: "bg-muted text-muted-foreground" },
  refunded: { label: "Reembolsado", tone: "bg-muted text-muted-foreground" },
};

/** Estado del pedido para la clienta (OrderStatus → etiqueta y color). */
export function OrderStatusPill({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold", s.tone, className)}>
      {s.label}
    </span>
  );
}
