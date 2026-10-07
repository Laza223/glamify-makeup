/**
 * Marca del producto a partir de su nombre. Glamify revende marcas de terceros y hoy la marca vive en el nombre
 * ("Gloss Espejo PINK 21"); no hay campo propio en el schema.
 */
const BRANDS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Pink 21", pattern: /\bpink\s*21\b/i },
  { label: "4 Angels", pattern: /\b4\s*angels\b/i },
  { label: "Ruby Rose", pattern: /\bruby\s*rose\b/i },
  { label: "Karité", pattern: /\bkarit[eé]\b/i },
  { label: "MELY", pattern: /\bmely\b/i },
  { label: "TEI", pattern: /\btei\b/i },
];

export function detectBrand(productName: string): string | null {
  return BRANDS.find((b) => b.pattern.test(productName))?.label ?? null;
}
