import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createReview = vi.fn();
const upload = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/customer/auth", () => ({ getCustomer: vi.fn(async () => null) }));
vi.mock("@/lib/reviews/service", () => ({ createReview: (...a: unknown[]) => createReview(...a) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => ({ upload: (...a: unknown[]) => upload(...a) }) } }),
}));

import { createReviewAction } from "@/app/(storefront)/producto/[slug]/review-actions";
import { REVIEW_PHOTO_FORMATS_LABEL, REVIEW_PHOTO_MIME } from "@/app/(storefront)/producto/[slug]/review-photo";

const valid = { productId: "p1", slug: "labial", rating: 5, title: "", body: "Hermoso", authorName: "Sofi" };

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  createReview.mockReset();
  upload.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe("createReviewAction", () => {
  it("un fallo técnico de la DB no llega a la clienta: mensaje propio + console.error", async () => {
    createReview.mockRejectedValue(new Error('Invalid `prisma.review.create()` invocation: connect ECONNREFUSED'));
    const res = await createReviewAction(valid);
    expect(res.ok).toBe(false);
    expect(res.error).not.toMatch(/prisma|ECONNREFUSED|invocation/i);
    expect(res.error).toBe("No pudimos enviar tu reseña. Probá de nuevo en un rato.");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("valida antes de tocar la DB y devuelve el motivo escrito para la clienta", async () => {
    const res = await createReviewAction({ ...valid, rating: 0 });
    expect(res).toEqual({ ok: false, error: "El puntaje debe ser de 1 a 5." });
    expect(createReview).not.toHaveBeenCalled();
  });

  it("un fallo al subir la foto no expone el error de Supabase", async () => {
    upload.mockResolvedValue({ error: { message: 'new row violates row-level security policy for "objects"' } });
    const fd = new FormData();
    for (const [k, v] of Object.entries({ productId: "p1", slug: "labial", rating: "5", body: "Lindo", authorName: "Sofi" })) {
      fd.set(k, v);
    }
    fd.set("photo", new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" }));
    const res = await createReviewAction(fd);
    expect(res.ok).toBe(false);
    expect(res.error).not.toMatch(/row-level|violates|objects/i);
    expect(errorSpy).toHaveBeenCalled();
    expect(createReview).not.toHaveBeenCalled();
  });

  it("rechaza un formato de foto fuera de la lista y nombra los formatos aceptados", async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ productId: "p1", slug: "labial", rating: "5", body: "Lindo", authorName: "Sofi" })) {
      fd.set(k, v);
    }
    fd.set("photo", new File([new Uint8Array([1])], "foto.gif", { type: "image/gif" }));
    const res = await createReviewAction(fd);
    expect(res.ok).toBe(false);
    expect(res.error).toContain(REVIEW_PHOTO_FORMATS_LABEL);
    expect(upload).not.toHaveBeenCalled();
  });

  it("los formatos del texto de ayuda cubren exactamente los del accept", () => {
    const shown = REVIEW_PHOTO_FORMATS_LABEL.split(/,| o /).map((s) => s.trim().toLowerCase().replace("jpg", "jpeg"));
    const accepted = REVIEW_PHOTO_MIME.map((m) => m.replace("image/", ""));
    expect(shown.sort()).toEqual([...accepted].sort());
  });
});
