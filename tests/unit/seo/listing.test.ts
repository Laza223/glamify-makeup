import { describe, it, expect } from "vitest";
import { listingSeo } from "@/lib/seo/listing";
import { parseProductListParams } from "@/lib/catalog/filters";

const seo = (raw: Record<string, string | string[] | undefined>) => listingSeo("/tienda", parseProductListParams(raw));

describe("listingSeo", () => {
  it("sin parámetros: canonical a la ruta limpia", () => {
    expect(seo({})).toEqual({ alternates: { canonical: "/tienda" } });
  });

  it("búsqueda: noindex,follow sin canonical", () => {
    expect(seo({ q: "TEI" })).toEqual({ alternates: { canonical: null }, robots: { index: false, follow: true } });
  });

  it("búsqueda vacía: como sin parámetros", () => {
    expect(seo({ q: "  " })).toEqual({ alternates: { canonical: "/tienda" } });
  });

  it("filtros u orden: canonical limpio, indexable, aunque haya página", () => {
    expect(seo({ orden: "precio_asc", page: "2" })).toEqual({ alternates: { canonical: "/tienda" } });
    expect(seo({ oferta: "1" })).toEqual({ alternates: { canonical: "/tienda" } });
    expect(seo({ min: "1000" })).toEqual({ alternates: { canonical: "/tienda" } });
  });

  it("paginación sola: canonical a sí misma", () => {
    expect(seo({ page: "3" })).toEqual({ alternates: { canonical: "/tienda?page=3" } });
  });

  it("page inválida se parsea igual que la vista (página 1)", () => {
    expect(seo({ page: "2.5" })).toEqual({ alternates: { canonical: "/tienda" } });
    expect(seo({ page: "abc" })).toEqual({ alternates: { canonical: "/tienda" } });
  });

  it("parámetros ajenos (campañas, Google Shopping, Instagram) se ignoran", () => {
    expect(seo({ utm_source: "instagram", srsltid: "x", igshid: "y" })).toEqual({ alternates: { canonical: "/tienda" } });
  });
});
