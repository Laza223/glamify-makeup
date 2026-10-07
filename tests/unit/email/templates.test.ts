import { describe, it, expect } from "vitest";
import { orderConfirmationEmail, newOrderAlertEmail, giftCardEmail, shipmentDispatchedEmail, shipmentAwaitingPickupEmail, shipmentDeliveredEmail, shipmentReturnedAlertEmail, retractionReceiptEmail, type OrderEmailData } from "@/lib/email/templates";
import { CORREO_TRACKING_URL } from "@/lib/shipping/tracking";

const data: OrderEmailData = {
  orderNumber: "GLM-000123",
  contactName: "Ana",
  contactEmail: "ana@example.com",
  items: [
    { name: "Labial Mate", variantName: "Rojo Pasión", qty: 2, lineTotal: 6400 },
    { name: "Gloss Brillo", variantName: null, qty: 1, lineTotal: 2500 },
  ],
  subtotal: 8900, shippingCost: 2500, discountTotal: 500, total: 10900,
  shippingMethod: "domicilio",
};

describe("orderConfirmationEmail", () => {
  it("incluye nº de pedido, ítems y total formateado", () => {
    const m = orderConfirmationEmail(data);
    expect(m.subject).toContain("GLM-000123");
    expect(m.html).toContain("Labial Mate");
    expect(m.html).toContain("Rojo Pasión");
    expect(m.html).toContain("$ 10.900,00");
    expect(m.text).toContain("GLM-000123");
  });
});

describe("newOrderAlertEmail", () => {
  it("avisa a la dueña con el total y el contacto", () => {
    const m = newOrderAlertEmail(data);
    expect(m.subject).toContain("GLM-000123");
    expect(m.html).toContain("ana@example.com");
    expect(m.html).toContain("$ 10.900,00");
  });
  it("destaca oversell cuando hay líneas sin stock", () => {
    const m = newOrderAlertEmail({ ...data, oversoldLines: [{ name: "Labial Mate (Rojo Pasión)" }] });
    expect(m.subject.toLowerCase()).toContain("revisar");
    expect(m.html.toLowerCase()).toContain("stock");
    expect(m.html).toContain("Labial Mate (Rojo Pasión)");
  });
  it("flaggea cuando el monto acreditado no coincide con el total", () => {
    const m = newOrderAlertEmail({ ...data, amountPaid: 8900 }); // pagó subtotal, total 10900
    expect(m.subject.toLowerCase()).toContain("revisar");
    expect(m.html).toContain("$ 8.900,00");
    expect(m.text.toLowerCase()).toContain("monto");
  });
  it("no flaggea cuando el monto coincide", () => {
    const m = newOrderAlertEmail({ ...data, amountPaid: 10900 });
    expect(m.subject.toLowerCase()).not.toContain("revisar");
  });
  it("avisa cuando el envío NO se cargó solo en MiCorreo", () => {
    const m = newOrderAlertEmail({ ...data, micorreoImport: { imported: false, detail: "dirección incompleta en el pedido" } });
    expect(m.subject.toLowerCase()).toContain("revisar");
    expect(m.html).toContain("NO se cargó");
    expect(m.html).toContain("dirección incompleta en el pedido");
    expect(m.text.toLowerCase()).toContain("micorreo");
  });
  it("no flaggea cuando el envío SÍ se cargó solo", () => {
    const m = newOrderAlertEmail({ ...data, micorreoImport: { imported: true, detail: "importado (ok)" } });
    expect(m.subject.toLowerCase()).not.toContain("revisar");
    expect(m.html).not.toContain("NO se cargó");
  });
});

describe("shipmentDispatchedEmail", () => {
  it("incluye nº de pedido, tracking y link de rastreo", () => {
    const m = shipmentDispatchedEmail({ orderNumber: "GLM-000123", contactName: "Ana", trackingNumber: "CA123456789AR", service: "Correo Argentino Clásico" });
    expect(m.subject).toContain("GLM-000123");
    expect(m.html).toContain("CA123456789AR");
    expect(m.html).toContain(CORREO_TRACKING_URL);
    expect(m.html).toContain("Ana");
    expect(m.text).toContain("CA123456789AR");
    expect(m.text).toContain(CORREO_TRACKING_URL);
  });
  it("escapa el nombre para no inyectar HTML", () => {
    const m = shipmentDispatchedEmail({ orderNumber: "GLM-1", contactName: "<script>x</script>", trackingNumber: "T1" });
    expect(m.html).not.toContain("<script>x</script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("escape de HTML en los mails de pedido", () => {
  const hostile: OrderEmailData = {
    ...data,
    contactName: "<script>x</script>",
    items: [{ name: "<img src=x onerror=1>", variantName: "<b>Rojo</b>", qty: 1, lineTotal: 100 }],
  };
  it("la confirmación a la clienta escapa nombre y productos", () => {
    const m = orderConfirmationEmail(hostile);
    expect(m.html).not.toContain("<script>x</script>");
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;script&gt;");
  });
  it("el aviso a la dueña escapa nombre, productos y líneas con oversell", () => {
    const m = newOrderAlertEmail({ ...hostile, oversoldLines: [{ name: "<i>x</i>" }] });
    expect(m.html).not.toContain("<script>x</script>");
    expect(m.html).not.toContain("<i>x</i>");
    expect(m.html).toContain("&lt;i&gt;x&lt;/i&gt;");
  });
  it("muestra el envío de forma legible", () => {
    expect(orderConfirmationEmail(data).html).toContain("a domicilio");
    expect(orderConfirmationEmail({ ...data, shippingMethod: "sucursal" }).html).toContain("a sucursal de Correo Argentino");
  });
  it("no usa emojis en el asunto", () => {
    const subjects = [orderConfirmationEmail(data).subject, newOrderAlertEmail(data).subject];
    for (const s of subjects) expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("link de WhatsApp en los mails a la clienta", () => {
  const url = "https://wa.me/5492323582495?text=Hola";
  const dispatch = { orderNumber: "GM-1", contactName: "Ana", trackingNumber: "AB123" };

  it("linkea el 'escribinos por WhatsApp' cuando hay número", () => {
    expect(orderConfirmationEmail({ ...data, whatsappUrl: url }).html).toContain(`<a href="${url}"`);
    expect(shipmentDispatchedEmail({ ...dispatch, whatsappUrl: url }).html).toContain(`<a href="${url}"`);
    expect(retractionReceiptEmail({ ticket: "ARR-000001", date: "1/1/2026", contactName: "Ana", whatsappUrl: url }).html).toContain(`<a href="${url}"`);
  });

  it("sin número deja el texto plano, sin link a wa.me", () => {
    for (const html of [
      orderConfirmationEmail(data).html,
      shipmentDispatchedEmail(dispatch).html,
      retractionReceiptEmail({ ticket: "ARR-000001", date: "1/1/2026", contactName: "Ana" }).html,
    ]) {
      expect(html).toContain("escribinos por WhatsApp");
      expect(html).not.toContain("wa.me");
    }
  });
});

describe("mails de seguimiento automático", () => {
  const xss = "<script>alert(1)</script>";

  it("esperando en sucursal: menciona la sucursal y escapa los datos", () => {
    const m = shipmentAwaitingPickupEmail({ orderNumber: "GLM-1", contactName: xss, trackingNumber: "CA1", facility: "OAM VILLA BALLESTER" });
    expect(m.subject).toContain("sucursal");
    expect(m.html).toContain("OAM VILLA BALLESTER");
    expect(m.html).not.toContain(xss);
  });

  it("entregado: con cuenta trae el botón de reseña; sin cuenta no", () => {
    expect(shipmentDeliveredEmail({ orderNumber: "GLM-1", contactName: "Ana", reviewUrl: "https://x/cuenta/pedidos/GLM-1" }).html).toContain("Dejar una reseña");
    expect(shipmentDeliveredEmail({ orderNumber: "GLM-1", contactName: "Ana" }).html).not.toContain("Dejar una reseña");
  });

  it("devuelto: alerta interna marcada REVISAR, escapa los datos", () => {
    const m = shipmentReturnedAlertEmail({ orderNumber: "GLM-1", contactName: xss, contactEmail: "a@x.com", contactPhone: null, trackingNumber: "CA1", lastEvent: null });
    expect(m.subject).toContain("REVISAR");
    expect(m.html).not.toContain(xss);
  });

  it("sin emojis en los asuntos", () => {
    const subjects = [
      shipmentAwaitingPickupEmail({ orderNumber: "GLM-1", contactName: "Ana", trackingNumber: "CA1", facility: null }).subject,
      shipmentDeliveredEmail({ orderNumber: "GLM-1", contactName: "Ana" }).subject,
      shipmentReturnedAlertEmail({ orderNumber: "GLM-1", contactName: "Ana", contactEmail: "a@x.com", contactPhone: null, trackingNumber: "CA1", lastEvent: null }).subject,
    ];
    for (const s of subjects) expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("link a la página de seguimiento propia", () => {
  const url = "https://www.glamifymakeup.site/seguimiento/2f0c1d4e-1111-4222-8333-444455556666";
  it("el botón del mail de despacho va a la página de la tienda, no a la de Correo", () => {
    const m = shipmentDispatchedEmail({ orderNumber: "GLM-1", contactName: "Ana", trackingNumber: "CA1", trackingUrl: url });
    expect(m.html).toContain(`href="${url}"`);
    expect(m.html).not.toContain("Pegá ese número");
    expect(m.text).toContain(url);
  });
  it("sin URL propia cae a la página de Correo (compatibilidad)", () => {
    expect(shipmentDispatchedEmail({ orderNumber: "GLM-1", contactName: "Ana", trackingNumber: "CA1" }).html).toContain(CORREO_TRACKING_URL);
  });
  it("el mail de sucursal también usa la página propia", () => {
    const m = shipmentAwaitingPickupEmail({ orderNumber: "GLM-1", contactName: "Ana", trackingNumber: "CA1", facility: null, trackingUrl: url });
    expect(m.html).toContain(`href="${url}"`);
  });
});

describe("giftCardEmail", () => {
  const cards = [
    { code: "GIFT-AAAA-BBBB", amount: 20000, validTo: new Date("2027-04-08T01:00:00Z") },
    { code: "GIFT-CCCC-DDDD", amount: 10000, validTo: new Date("2027-04-08T01:00:00Z") },
  ];
  it("asunto, un bloque por código con monto y vencimiento en ART, y las condiciones", () => {
    const m = giftCardEmail({ orderNumber: "GLM-000050", contactName: "Ana", cards, whatsappUrl: "https://wa.me/1" });
    expect(m.subject).toBe("Tu Gift Card Glamify");
    expect(m.html).toContain("GIFT-AAAA-BBBB");
    expect(m.html).toContain("GIFT-CCCC-DDDD");
    expect(m.html).toContain("$ 20.000,00");
    expect(m.html).toContain("07/04/2027");
    expect(m.html).toContain("ingresá el código en el carrito");
    expect(m.html).toMatch(/Un solo uso/);
    expect(m.html).toMatch(/no el envío/);
    expect(m.html).toMatch(/no se acumula con otras gift cards/i);
    expect(m.html).toMatch(/saldo no se conserva/);
    expect(m.html).toContain("https://wa.me/1");
    expect(m.text).toContain("GIFT-AAAA-BBBB");
  });
  it("escapa el nombre", () => {
    const m = giftCardEmail({ orderNumber: "GLM-1", contactName: "<b>x</b>", cards: [cards[0]] });
    expect(m.html).not.toContain("<b>x</b>");
  });
});

describe("emails de pedido digital", () => {
  const digital: OrderEmailData = { ...data, shippingMethod: "digital", shippingCost: 0, discountTotal: 0, subtotal: 20000, total: 20000 };
  it("confirmación: sin fila de envío ni texto de despacho", () => {
    const m = orderConfirmationEmail(digital);
    expect(m.html).toContain("Te mandamos la gift card en otro mail");
    expect(m.html).not.toMatch(/despachemos|>Envío</);
    expect(m.text).not.toMatch(/Envío:/);
  });
  it("alerta a la dueña: indica que no requiere envío y no marca REVISAR", () => {
    const m = newOrderAlertEmail(digital);
    expect(m.html).toContain("Pedido de gift card: no requiere envío");
    expect(m.subject).not.toMatch(/REVISAR/);
  });
  it("alerta con cupón excedido → REVISAR y detalle", () => {
    const m = newOrderAlertEmail({ ...data, couponOverLimit: "GLAM10" });
    expect(m.subject).toMatch(/REVISAR/);
    expect(m.html).toContain("GLAM10");
  });
});
