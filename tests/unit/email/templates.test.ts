import { describe, it, expect } from "vitest";
import { orderConfirmationEmail, newOrderAlertEmail, shipmentDispatchedEmail, retractionReceiptEmail, type OrderEmailData } from "@/lib/email/templates";
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
