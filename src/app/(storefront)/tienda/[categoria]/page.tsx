import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { parseProductListParams } from "@/lib/catalog/filters";
import { getProductList, resolveCategoryPath } from "@/lib/catalog/queries";
import { ProductListView } from "@/components/catalog/product-list-view";
import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";
import { buildBreadcrumbs } from "@/lib/catalog/categories";

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }): Promise<Metadata> {
  const { categoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria);
  if (!resolved) return { title: "Categoría" };
  return { title: resolved.category.name, description: `Productos de ${resolved.category.name}.` };
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { categoria } = await params;
  const { resolved, tree } = await resolveCategoryPath(categoria);
  if (!resolved) notFound();

  const listParams = parseProductListParams(await searchParams, { categorySlug: categoria });
  const result = await getProductList(listParams, resolved.categoryIds);
  const crumbs = buildBreadcrumbs({ category: resolved.category });

  return (
    <div className="space-y-4">
      <CatalogBreadcrumbs items={crumbs} />
      {resolved.category.children.length > 0 && (
        <nav aria-label="Subcategorías">
          <ul className="flex flex-wrap gap-2">
            {resolved.category.children.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={`/tienda/${resolved.category.slug}/${sub.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-[15px] font-semibold hover:border-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ProductListView
        title={resolved.category.name}
        result={result}
        categories={tree.filter((c) => c.showInMenu)}
        activeSlug={resolved.category.slug}
      />
    </div>
  );
}
