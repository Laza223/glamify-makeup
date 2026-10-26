interface SummaryItem {
  qty: number;
  variant: { name: string; sku: string; product: { name: string } };
}

/** Detalle de lo que lleva un regalo armado ("2× Labial – Rosa (LAB-0007); …"): se muestra en carrito y se snapshotea en el pedido. */
export function bundleSummary(bundleKind: string | null, items: ReadonlyArray<SummaryItem>): string | null {
  if (!bundleKind) return null;
  return items.map((i) => `${i.qty}× ${i.variant.product.name} – ${i.variant.name} (${i.variant.sku})`).join("; ");
}
