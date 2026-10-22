import { describe, it, expect } from "vitest";
import { abandonedCartEmail } from "@/lib/email/templates";
import { businessInfo } from "@/lib/legal/business-info";

describe("abandonedCartEmail", () => {
  it("incluye el nombre, los items y el link de recupero", () => {
    const r = abandonedCartEmail({
      name: "Ana",
      items: [{ name: "Labial", variantName: "Rojo", qty: 2, lineTotal: 9000 }],
      recoverUrl: "http://localhost:3000/carrito",
    });
    expect(r.subject).toMatch(/carrito/i);
    expect(r.html).toContain("Ana");
    expect(r.html).toContain("Labial");
    expect(r.html).toContain("http://localhost:3000/carrito");
    expect(r.text).toContain("Labial");
  });
  it("el footer explica cómo darse de baja: email de contacto o WhatsApp", () => {
    const data = { name: "Ana", items: [{ name: "Labial", variantName: null, qty: 1, lineTotal: 4500 }], recoverUrl: "http://localhost:3000/carrito" };
    const sin = abandonedCartEmail(data);
    expect(sin.html).toContain(businessInfo.email);
    expect(sin.html).toMatch(/baja/i);
    expect(sin.text).toContain(businessInfo.email);
    const con = abandonedCartEmail({ ...data, whatsappUrl: "https://wa.me/5491100000000" });
    expect(con.html).toContain('href="https://wa.me/5491100000000"');
    expect(con.text).toContain("https://wa.me/5491100000000");
  });
});
