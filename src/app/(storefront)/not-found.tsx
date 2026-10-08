import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No encontramos esta página" };

/** 404 de fichas y categorías inexistentes (`notFound()` dentro del storefront), con header y footer. */
export default function StorefrontNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-16 text-center md:py-24">
      <p aria-hidden className="font-display text-[96px] italic leading-none text-primary md:text-[128px]">
        404
      </p>
      <div className="space-y-2">
        <h1 className="font-display text-[32px] font-normal leading-tight md:text-[40px]">
          Uy, esta página se nos <em className="font-medium text-primary">perdió</em>
        </h1>
        <p className="text-[16px] text-muted-foreground">
          Capaz cambió de lugar o el link está mal escrito. Lo que buscás seguro está en la tienda.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/tienda"
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-foreground px-7 text-[16px] font-semibold text-white transition hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Ir a la tienda
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-7 text-[16px] font-semibold text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
