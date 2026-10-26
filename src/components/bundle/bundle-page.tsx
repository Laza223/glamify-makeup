import { getBundleBuilderData } from "@/lib/bundle/builder-data";
import { BundleBuilder } from "@/components/bundle/bundle-builder";
import type { BundleKindKey } from "@/lib/bundle/rules";

/** Página del builder de ramo/box (server): carga los productos y el empaque. */
export async function BundlePage({ kind }: { kind: BundleKindKey }) {
  const { products, packagingFee } = await getBundleBuilderData();
  return (
    <div className="py-8 md:py-12">
      <BundleBuilder kind={kind} products={products} packagingFee={packagingFee} />
    </div>
  );
}
