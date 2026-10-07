import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeaderContent } from "@/components/layout/site-header-content";
import { getCategoryTree } from "@/lib/catalog/queries";
import { filterVisibleInNav } from "@/lib/catalog/categories";
import { getCartView } from "@/lib/cart/cart-view";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";

export async function SiteHeader() {
  const [tree, { count }, threshold] = await Promise.all([getCategoryTree(), getCartView(), getFreeShippingThreshold()]);
  return (
    <header className="sticky top-0 z-30">
      <AnnouncementBar freeShippingThreshold={threshold} />
      <SiteHeaderContent tree={filterVisibleInNav(tree)} count={count} />
    </header>
  );
}
