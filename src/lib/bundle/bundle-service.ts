import "server-only";
import { prisma } from "@/lib/prisma";
import { getEffectivePrice, toNumber } from "@/lib/catalog/pricing";
import { isProductMadeToOrder } from "@/lib/catalog/made-to-order";
import { isProductGiftCard } from "@/lib/catalog/gift-card";
import { CustomerFacingError } from "@/lib/orders/customer-error";
import { formatPrice } from "@/lib/money";
import {
  BUNDLE_KIND_LABEL,
  BUNDLE_MINIMUM,
  MAX_BUNDLE_UNITS,
  computeBundlePricing,
  normalizeSelection,
  type BundleKindKey,
} from "@/lib/bundle/rules";

export async function getBundlePackagingFee(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { id: "default" }, select: { bundlePackagingFee: true } });
  return s ? toNumber(s.bundlePackagingFee) : 0;
}

/**
 * Crea el regalo armado como un Combo (bundleKind != null) y devuelve su id. Todo se valida y se
 * calcula acá: precios, stock, mínimo y empaque. El combo queda inmutable, así que el mínimo no se
 * puede romper después y el carrito/checkout/stock reutilizan la lógica de combos tal cual.
 */
export async function createBundle(kind: BundleKindKey, rawSelection: unknown): Promise<string> {
  const selection = normalizeSelection(rawSelection);
  if (!selection) {
    throw new CustomerFacingError(`Elegí entre 1 y ${MAX_BUNDLE_UNITS} productos para armar ${BUNDLE_KIND_LABEL[kind].article}.`);
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: selection.map((s) => s.variantId) } },
    include: { product: { include: { category: true, categories: { select: { category: { select: { slug: true } } } } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const priced: Array<{ variantId: string; qty: number; unitPrice: number }> = [];
  for (const s of selection) {
    const v = byId.get(s.variantId);
    if (!v || !v.active || !v.product.active || v.product.deletedAt) {
      throw new CustomerFacingError("Alguno de los productos ya no está disponible.");
    }
    if (isProductMadeToOrder(v.product) || isProductGiftCard(v.product)) {
      throw new CustomerFacingError("Ese producto no se puede incluir en un regalo armado.");
    }
    if (v.stock < s.qty) {
      throw new CustomerFacingError(`No hay stock suficiente de ${v.product.name}. Ajustá la cantidad.`);
    }
    priced.push({ variantId: v.id, qty: s.qty, unitPrice: getEffectivePrice(v.product, v) });
  }

  const pricing = computeBundlePricing(priced, await getBundlePackagingFee());
  if (!pricing.meetsMinimum) {
    throw new CustomerFacingError(
      `El mínimo para armar ${BUNDLE_KIND_LABEL[kind].article} es ${formatPrice(BUNDLE_MINIMUM)} en productos. Te faltan ${formatPrice(pricing.missing)}.`,
    );
  }

  const images = selection
    .map((s) => byId.get(s.variantId)!.product.images[0])
    .filter((i): i is string => Boolean(i))
    .slice(0, 4);

  const combo = await prisma.combo.create({
    data: {
      slug: `${kind}-${crypto.randomUUID()}`,
      name: BUNDLE_KIND_LABEL[kind].name,
      comboPrice: pricing.total,
      images,
      bundleKind: kind,
      packagingFee: pricing.packagingFee,
      items: { create: priced.map((p) => ({ variantId: p.variantId, qty: p.qty })) },
    },
  });
  return combo.id;
}
