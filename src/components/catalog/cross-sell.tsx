import { ProductGrid } from "@/components/catalog/product-grid";
import type { CatalogProduct } from "@/lib/catalog/types";

/** "Te puede gustar": cross-sell de productos relacionados (blueprint 06 §2). */
export function CrossSell({ products }: { products: CatalogProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="space-y-6 border-t border-border pt-12">
      <h2 className="font-display text-[30px] font-normal leading-tight md:text-[38px]">
        Te va a <em className="font-medium text-primary">encantar</em>
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
