const MAX_LENGTH = 155;

/**
 * Meta description a partir de la descripción del producto: sin emojis ni saltos de línea, cortada en un
 * límite de palabra para no pasar los ~155 caracteres que muestra Google. `null` si no queda texto.
 */
export function toMetaDescription(text: string | null | undefined, max = MAX_LENGTH): string | null {
  if (!text) return null;
  const plain = text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
