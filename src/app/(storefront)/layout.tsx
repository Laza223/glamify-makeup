import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartContents } from "@/components/cart/cart-contents";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { ExitIntent } from "@/components/marketing/exit-intent";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { PreviewBanner } from "@/components/layout/preview-banner";
import { getCartView } from "@/lib/cart/cart-view";

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { count, lines } = await getCartView();
  const initialLines = lines.map((l) => ({
    id: l.id,
    refId: l.refId,
    productId: l.productId ?? null,
    qty: l.qty,
  }));

  return (
    <PostHogProvider>
      <CartProvider initialLines={initialLines} initialCount={count}>
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>
        <div className="flex min-h-dvh flex-col">
          <PreviewBanner />
          <SiteHeader />
          <main
            id="main"
            tabIndex={-1}
            className="container flex-1 pb-20 pt-4 md:pb-8"
          >
            {children}
          </main>
          <SiteFooter />
          <BottomNav cartCount={count} />
        </div>
        <CartDrawer>
          <CartContents />
        </CartDrawer>
        <WhatsAppFab />
        <CookieConsent />
        <ExitIntent />
      </CartProvider>
    </PostHogProvider>
  );
}
