import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { AccountEmpty } from "../account-empty";

export default async function PedidosPage() {
  const customer = await requireCustomer();
  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, total: true, status: true, createdAt: true },
  });

  if (orders.length === 0) {
    return <AccountEmpty icon={Package} lead="Todavía no hay" accent="pedidos" text="Cuando compres, acá vas a ver el estado de cada pedido y su seguimiento." />;
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[20px] border border-border">
      {orders.map((o) => (
        <li key={o.orderNumber}>
          <Link
            href={`/cuenta/pedidos/${o.orderNumber}`}
            className="group flex min-h-[72px] items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold tabular-nums">{o.orderNumber}</p>
              <p className="text-[14px] text-muted-foreground">
                {o.createdAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })}
              </p>
            </div>
            <OrderStatusPill status={o.status} />
            <span className="hidden w-24 text-right text-[16px] font-bold tabular-nums sm:block">{formatPrice(Number(o.total))}</span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
