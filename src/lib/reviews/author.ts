export const ANONYMOUS_AUTHOR = "Clienta";

/** Nombre público de la autora: nunca un email; sin nombre → "Clienta". */
export function publicAuthorName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  return n === "" || n.includes("@") ? ANONYMOUS_AUTHOR : n;
}
