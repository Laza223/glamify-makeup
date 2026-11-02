import { Fragment } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Crumb } from "@/lib/catalog/categories";
import { buildBreadcrumbListJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/url";

export function CatalogBreadcrumbs({ items }: { items: Crumb[] }) {
  const parent = items.length >= 2 ? items[items.length - 2] : items[0];
  const jsonLd = buildBreadcrumbListJsonLd(items.map((c) => ({ label: c.label, url: absoluteUrl(c.href) })));

  return (
    <nav aria-label="Ruta de navegación">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      {/* Mobile: Navegación simple ← Categoría sin partirse en dos líneas */}
      {parent && (
        <div className="md:hidden">
          <Link
            href={parent.href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-0.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>Volver a {parent.label}</span>
          </Link>
        </div>
      )}

      {/* Desktop: Breadcrumb jerárquico completo */}
      <div className="hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            {items.map((c, i) => (
              <Fragment key={c.href}>
                <BreadcrumbItem>
                  {c.current ? (
                    <BreadcrumbPage className="line-clamp-1">{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {i < items.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </nav>
  );
}
