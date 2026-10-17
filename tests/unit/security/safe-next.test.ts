import { describe, it, expect } from "vitest";
import { sanitizeNext } from "@/lib/auth/safe-next";

const ORIGIN = "https://www.glamifymakeup.site";

describe("sanitizeNext", () => {
  it.each(["/cuenta", "/producto/gloss-tei?tono=rojo#opiniones", "/tienda?q=labial%20mate", "/%2F/evil.com"])(
    "deja pasar el path interno %j",
    (next) => {
      expect(sanitizeNext(next)).toBe(next);
      expect(new URL(sanitizeNext(next), ORIGIN).origin).toBe(ORIGIN);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "cuenta",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/\u0000/evil.com",
    "/\u007f/evil.com",
    "%2F%2Fevil.com",
  ])("manda %j a /cuenta", (next) => {
    expect(sanitizeNext(next)).toBe("/cuenta");
  });

  it("nada de lo que devuelve sale del sitio al resolverse en el navegador", () => {
    const hostile = ["/\t/evil.com", "/\n\n/evil.com", "/ /evil.com", "/.//evil.com", "/..//evil.com", "/%09/evil.com"];
    for (const next of hostile) {
      expect(new URL(sanitizeNext(next), ORIGIN).origin).toBe(ORIGIN);
    }
  });
});
