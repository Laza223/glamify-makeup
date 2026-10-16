import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Wrapper tipográfico para páginas de texto (legales/contenido).
 *  Headings jerárquicos, ancho de lectura y links con contraste AA. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        "mx-auto max-w-prose space-y-4 py-8 text-[16px] text-foreground md:py-12",
        // Misma voz que PageTitle: Playfair liviana; una <em> en el h1 sale en itálica rosa.
        "[&_h1]:mb-6 [&_h1]:font-display [&_h1]:text-[34px] [&_h1]:font-normal [&_h1]:leading-[1.1] md:[&_h1]:text-[46px]",
        "[&_h1_em]:font-medium [&_h1_em]:text-primary",
        "[&_h2]:!mt-10 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:font-normal [&_h2]:leading-snug md:[&_h2]:text-[26px]",
        "[&_p]:leading-relaxed",
        "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:leading-relaxed [&_li]:marker:text-primary",
        "[&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-4 hover:[&_a]:decoration-primary",
        "[&_strong]:font-semibold",
        className,
      )}
    >
      {children}
    </article>
  );
}
