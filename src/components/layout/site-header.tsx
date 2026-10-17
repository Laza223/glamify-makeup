import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeaderContent } from "@/components/layout/site-header-content";
import { StickyHeader } from "@/components/layout/sticky-header";
import { getCategoryTree } from "@/lib/catalog/queries";
import { filterVisibleInNav } from "@/lib/catalog/categories";
import { getCartView } from "@/lib/cart/cart-view";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";

export async function SiteHeader() {
  const [tree, { count }, threshold] = await Promise.all([getCategoryTree(), getCartView(), getFreeShippingThreshold()]);
  return (
    <StickyHeader>
      <AnnouncementBar freeShippingThreshold={threshold} />
      <SiteHeaderContent tree={filterVisibleInNav(tree)} count={count} />
    </StickyHeader>
  );
}
