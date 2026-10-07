import type { Metadata } from "next";
import { parseProductListParams } from "@/lib/catalog/filters";
import { getProductList, getCategoryTree } from "@/lib/catalog/queries";
import { filterVisibleInNav } from "@/lib/catalog/categories";
import { ProductListView } from "@/components/catalog/product-list-view";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Explorá todo el catálogo de maquillaje y accesorios.",
};

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, tree] = await Promise.all([
    parseProductListParams(await searchParams),
    getCategoryTree().then((t) => filterVisibleInNav(t)),
  ]);
  const result = await getProductList(params, null);
  // Búsqueda: título con lo que buscó (lo usa el buscador del header y la tira de marcas de la home).
  if (params.search) {
    return <ProductListView title="Resultados para" accent={`“${params.search}”`} result={result} categories={tree} />;
  }
  return <ProductListView title="Toda la" accent="tienda" result={result} categories={tree} />;
}
