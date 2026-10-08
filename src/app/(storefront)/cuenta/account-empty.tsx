import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Estado vacío de las secciones de la cuenta: ícono, título con acento y CTA a la tienda. */
export function AccountEmpty({ icon: Icon, lead, accent, text }: { icon: LucideIcon; lead: string; accent: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-secondary px-6 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-white text-primary">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="mt-5 font-display text-[26px] leading-snug">
        {lead} <em className="font-medium text-primary">{accent}</em>
      </p>
      <p className="mt-2 max-w-[38ch] text-[16px] text-muted-foreground">{text}</p>
      <Link
        href="/tienda"
        className="mt-6 inline-flex h-12 items-center rounded-2xl bg-foreground px-6 text-[16px] font-semibold text-white transition hover:bg-foreground/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Ir a la tienda
      </Link>
    </div>
  );
}
