import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  lead?: string;
  /** La palabra en itálica rosa: la voz del hero y de los títulos de sección. */
  accent: string;
  tail?: string;
  eyebrow?: string;
  children?: ReactNode;
  center?: boolean;
  className?: string;
}

/** Título de página del storefront: Playfair, una palabra en itálica rosa y una bajada opcional. */
export function PageTitle({ lead, accent, tail, eyebrow, children, center, className }: PageTitleProps) {
  return (
    <header className={cn("space-y-3", center && "text-center", className)}>
      {eyebrow && <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
      <h1 className="font-display text-[34px] font-normal leading-[1.1] text-foreground md:text-[46px]">
        {lead && <>{lead} </>}
        <em className="font-medium text-primary">{accent}</em>
        {tail && <> {tail}</>}
      </h1>
      {children && (
        <div className={cn("max-w-[56ch] text-[16px] leading-relaxed text-muted-foreground md:text-[17px]", center && "mx-auto")}>
          {children}
        </div>
      )}
    </header>
  );
}
