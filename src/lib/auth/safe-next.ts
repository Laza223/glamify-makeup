/**
 * Solo paths internos relativos (anti open-redirect). Default: `/cuenta`.
 * Rechaza `//`, `\` y todo lo que no sea ASCII imprimible: el parser de URL normaliza el backslash
 * a slash y borra tab/CR/LF (`/\evil.com` o `/<tab>/evil.com` terminan siendo `//evil.com`), y un
 * carácter fuera de ASCII rompe el header Location de `redirect()` con un 500.
 */
export function sanitizeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/cuenta";
  if (/[^\x21-\x7e]|\\/.test(next)) return "/cuenta";
  // Red final: resuelto contra un origen cualquiera, tiene que quedarse en ese origen.
  try {
    if (new URL(next, "http://glamify.invalid").origin !== "http://glamify.invalid") return "/cuenta";
  } catch {
    return "/cuenta";
  }
  return next;
}
