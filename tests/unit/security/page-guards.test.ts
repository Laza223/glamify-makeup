import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

// Un guard en el layout NO protege las pages: en una navegación RSC el cliente
// manda `Next-Router-State-Tree` y Next 15 no re-renderiza los layouts cuyos
// segmentos ya "tiene", así que un request anónimo con ese header armado ejecuta
// la page sin pasar por el layout. Cada page autenticada tiene que llamar a su
// guard por su cuenta, al inicio del componente.

function findPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return findPages(full);
    return e.name === "page.tsx" ? [full] : [];
  });
}

/**
 * El guard tiene que ser la primera sentencia del default export (no un comentario ni
 * un helper suelto). Solo se tolera desestructurar `params` antes: no lee datos.
 */
function guardIsFirstStatement(src: string, guard: string): boolean {
  const signature = String.raw`export default async function \w*\([\s\S]*?\)\s*\{\s*`;
  const params = String.raw`(?:const \{[^}]*\} = await params;\s*)?`;
  const call = String.raw`(?:const \w+ = )?await ${guard}\(\);`;
  return new RegExp(signature + params + call).test(src);
}

const SURFACES = [
  {
    name: "admin (salvo login)",
    dir: path.join(process.cwd(), "src", "app", "admin"),
    exclude: [path.join("admin", "login", "page.tsx")],
    guard: "requireAdmin",
    importFrom: "@/lib/admin/auth",
    minPages: 18,
  },
  {
    name: "(storefront)/cuenta",
    dir: path.join(process.cwd(), "src", "app", "(storefront)", "cuenta"),
    guard: "requireCustomer",
    importFrom: "@/lib/customer/auth",
    exclude: [],
    minPages: 5,
  },
];

describe.each(SURFACES)("pages de $name llaman a $guard", ({ dir, guard, importFrom, exclude, minPages }) => {
  const pages = findPages(dir).filter((p) => !exclude.some((e) => p.endsWith(e)));

  it("encuentra las pages (el glob no quedó vacío)", () => {
    expect(pages.length).toBeGreaterThanOrEqual(minPages);
  });

  it.each(pages.map((p) => [path.relative(process.cwd(), p), p]))("%s", (_rel, file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain(`from "${importFrom}"`);
    expect(guardIsFirstStatement(src, guard)).toBe(true);
  });
});
