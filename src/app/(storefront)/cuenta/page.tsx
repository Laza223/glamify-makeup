import Link from "next/link";
import { ArrowRight, Heart, Package, UserRound } from "lucide-react";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { OrderStatusPill } from "@/components/orders/order-status-pill";

const cardClass =
  "group flex flex-col rounded-[20px] border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_10px_30px_-18px_rgba(22,20,19,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0";

function CardHead({ icon: Icon, title }: { icon: typeof Package; title: string }) {
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="flex-1 text-[17px] font-semibold text-foreground">{title}</span>
      <ArrowRight className="size-[18px] text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" aria-hidden />
    </span>
  );
}

export default async function CuentaHome() {
  const customer = await requireCustomer();
  const [orders, wishlistCount] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { orderNumber: true, total: true, status: true },
    }),
    prisma.wishlist.count({ where: { customerId: customer.id } }),
  ]);
  const firstName = customer.name?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <p className="font-display text-[24px] leading-snug md:text-[28px]">
        Hola{firstName ? <>, <em className="font-medium text-primary">{firstName}</em></> : null}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/cuenta/pedidos" className={`${cardClass} md:col-span-2`}>
          <CardHead icon={Package} title="Últimos pedidos" />
          {orders.length === 0 ? (
            <p className="mt-4 text-[15px] text-muted-foreground">Todavía no hiciste pedidos. Cuando compres, los seguís desde acá.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {orders.map((o) => (
                <li key={o.orderNumber} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                  <span className="font-semibold tabular-nums">{o.orderNumber}</span>
                  <span className="flex items-center gap-3">
                    <OrderStatusPill status={o.status} />
                    <span className="hidden font-semibold tabular-nums sm:inline">{formatPrice(Number(o.total))}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Link>
        <div className="grid gap-4">
          <Link href="/cuenta/favoritos" className={cardClass}>
            <CardHead icon={Heart} title="Favoritos" />
            <p className="mt-3 text-[15px] text-muted-foreground">
              <span className="font-display text-[32px] leading-none text-foreground">{wishlistCount}</span>{" "}
              {wishlistCount === 1 ? "producto guardado" : "productos guardados"}
            </p>
          </Link>
          <Link href="/cuenta/datos" className={cardClass}>
            <CardHead icon={UserRound} title="Mis datos" />
            <p className="mt-3 text-[15px] text-muted-foreground">Nombre y teléfono para tus envíos.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
