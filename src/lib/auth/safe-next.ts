/**
 * Solo paths internos relativos (anti open-redirect). Default: `/cuenta`.
 * Rechaza `//`, `\` y caracteres de control: el parser de URL normaliza el backslash a slash
 * y borra tab/CR/LF, así que `/\evil.com` o `/<tab>/evil.com` terminan siendo `//evil.com`.
 */
export function sanitizeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/cuenta";
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return "/cuenta";
  // Red final: resuelto contra un origen cualquiera, tiene que quedarse en ese origen.
  try {
    if (new URL(next, "http://glamify.invalid").origin !== "http://glamify.invalid") return "/cuenta";
  } catch {
    return "/cuenta";
  }
  return next;
}
