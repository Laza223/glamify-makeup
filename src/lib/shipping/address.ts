/** DNI argentino: 7 u 8 dígitos (lo pide la empresa de envío para entregar/retirar). */
const DNI_RE = /^\d{7,8}$/;

/** Saca puntos, espacios y guiones: "30.123.456" → "30123456". */
export function normalizeDni(value: string | null | undefined): string {
  return (value ?? "").replace(/[.\s-]/g, "");
}

export const DNI_ERROR = "Ingresá el DNI de quien recibe (7 u 8 números).";

export interface AddressToValidate {
  cp?: string | null;
  province?: string | null;
  city?: string | null;
  street?: string | null;
  number?: string | null;
  dni?: string | null;
}

/** Validación mínima de la dirección en el server (el cliente valida lo mismo, pero no se confía). `null` = válida. */
export function validateShippingAddress(method: "domicilio" | "sucursal", a: AddressToValidate): string | null {
  if (!/^\d{4}$/.test(a.cp ?? "")) return "Código postal inválido (4 dígitos).";
  if (method === "sucursal" && !a.province?.trim()) return "Elegí tu provincia.";
  if (!a.city?.trim()) return "Ingresá tu localidad.";
  if (method === "domicilio" && (!a.street?.trim() || !a.number?.trim())) return "Completá calle y número.";
  if (!DNI_RE.test(normalizeDni(a.dni))) return DNI_ERROR;
  return null;
}

/** Claves de dirección que se guardan en `Order.shippingAddress`: nada más de lo que mande el cliente. */
export interface StoredAddress {
  cp: string;
  province: string | null;
  street: string;
  number: string;
  floorApt: string | null;
  city: string;
  notes: string | null;
  dni: string;
}

/** Arma el snapshot de dirección con SOLO las claves permitidas (y el DNI normalizado). */
export function sanitizeAddress(a: {
  cp: string;
  province?: string | null;
  street?: string | null;
  number?: string | null;
  floorApt?: string | null;
  city?: string | null;
  notes?: string | null;
  dni?: string | null;
}): StoredAddress {
  return {
    cp: a.cp,
    province: a.province ?? null,
    street: a.street ?? "",
    number: a.number ?? "",
    floorApt: a.floorApt ?? null,
    city: a.city ?? "",
    notes: a.notes ?? null,
    dni: normalizeDni(a.dni),
  };
}
