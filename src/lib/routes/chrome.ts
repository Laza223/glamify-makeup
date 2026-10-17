/**
 * Qué capas fijas del storefront van en cada ruta: una sola fuente para header,
 * menú inferior, footer, WhatsApp y popups (antes eran 5 `startsWith("/checkout")` sueltos).
 */
export interface StorefrontChrome {
  /** Header completo (anuncio, búsqueda, categorías) o el mínimo del checkout. */
  header: "full" | "checkout";
  /** "Volver al carrito" en el header mínimo; en la confirmación de compra el carrito ya está vacío. */
  backToCart: boolean;
  bottomNav: boolean;
  footer: "full" | "minimal";
  whatsappFab: boolean;
  exitIntent: boolean;
  cookieBanner: boolean;
  /** Barra fija de compra: en la ficha solo en mobile, en el kit siempre. El footer le deja lugar. */
  buyBar: "none" | "mobile" | "always";
}

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function chromeFor(pathname: string): StorefrontChrome {
  const checkout = isUnder(pathname, "/checkout");
  const buyBar = pathname.startsWith("/producto/") ? "mobile" : isUnder(pathname, "/arma-tu-kit") ? "always" : "none";
  return {
    header: checkout ? "checkout" : "full",
    backToCart: checkout && !isUnder(pathname, "/checkout/gracias"),
    bottomNav: !checkout,
    footer: checkout ? "minimal" : "full",
    // Con barra de compra el botón taparía el CTA; en el checkout, inputs y el botón de pagar.
    whatsappFab: !checkout && buyBar === "none",
    exitIntent: !checkout,
    cookieBanner: !checkout,
    buyBar,
  };
}
