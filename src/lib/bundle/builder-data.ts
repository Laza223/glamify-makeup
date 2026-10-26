import "server-only";
import { prisma } from "@/lib/prisma";
import { PRODUCT_INCLUDE } from "@/lib/catalog/queries";
import { toCatalogProduct } from "@/lib/catalog/dto";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { isProductGiftCard } from "@/lib/catalog/gift-card";
import { getBundlePackagingFee } from "@/lib/bundle/bundle-service";

/** Productos con stock que se pueden meter en un ramo/box (sin gift cards ni "a pedido") + empaque. */
export async function getBundleBuilderData() {
  const [rows, packagingFee] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, deletedAt: null, variants: { some: { active: true, stock: { gt: 0 } } } },
      include: PRODUCT_INCLUDE,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    }),
    getBundlePackagingFee(),
  ]);
  const products = rows
    .filter((p) => !isProductMadeToOrder(p) && !isProductGiftCard(p))
    .map(toCatalogProduct)
    .map((p) => ({ ...p, variants: p.variants.filter((v) => v.active && v.stock > 0) }));
  return { products, packagingFee };
}
