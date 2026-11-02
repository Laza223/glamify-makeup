import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseProductListParams } from "@/lib/catalog/filters";
import { getProductList, resolveCategoryPath } from "@/lib/catalog/queries";
import { ProductListView } from "@/components/catalog/product-list-view";
import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";
import { buildBreadcrumbs } from "@/lib/catalog/categories";
import { listingSeo } from "@/lib/seo/listing";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string; subcategoria: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { categoria, subcategoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria, subcategoria);
  if (!resolved?.subcategory) return { title: "Categoría" };
  return {
    title: resolved.subcategory.name,
    description: `Productos de ${resolved.subcategory.name}.`,
    ...listingSeo(`/tienda/${categoria}/${subcategoria}`, parseProductListParams(await searchParams)),
  };
}

export default async function SubcategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string; subcategoria: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { categoria, subcategoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria, subcategoria);
  if (!resolved?.subcategory) notFound();

  const listParams = parseProductListParams(await searchParams, { categorySlug: categoria, subcategorySlug: subcategoria });
  const result = await getProductList(listParams, resolved.categoryIds);
  const crumbs = buildBreadcrumbs({ category: resolved.category, subcategory: resolved.subcategory });

  return (
    <div className="space-y-4">
      <CatalogBreadcrumbs items={crumbs} />
      <ProductListView title={resolved.subcategory.name} result={result} />
    </div>
  );
}
