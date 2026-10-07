"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Truck, CreditCard } from "lucide-react";

const MESSAGES = [
  {
    icon: Truck,
    text: "Envío gratis a todo el país superando el monto mínimo",
  },
  {
    icon: CreditCard,
    text: "Pagá con tarjeta o dinero en cuenta de Mercado Pago",
  },
];

export function AnnouncementBar() {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  if (pathname.startsWith("/checkout")) return null;

  const current = MESSAGES[index];
  const Icon = current.icon;

  return (
    <div className="relative select-none overflow-hidden border-b border-white/10 bg-[#161413] px-4 py-2 text-center text-[#FBF9F6]">
      <div className="container flex min-h-[20px] items-center justify-center">
        <div
          key={index}
          className="inline-flex animate-fade-up items-center justify-center gap-2 text-xs font-medium tracking-wide md:text-sm"
        >
          <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{current.text}</span>
        </div>
      </div>
    </div>
  );
}
