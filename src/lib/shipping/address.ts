export interface AddressToValidate {
  cp?: string | null;
  city?: string | null;
  street?: string | null;
  number?: string | null;
  agencyCode?: string | null;
}

/** Validación mínima de la dirección en el server (el cliente valida lo mismo, pero no se confía). `null` = válida. */
export function validateShippingAddress(method: "domicilio" | "sucursal", a: AddressToValidate): string | null {
  if (!/^\d{4}$/.test(a.cp ?? "")) return "Código postal inválido (4 dígitos).";
  if (!a.city?.trim()) return "Ingresá tu localidad.";
  if (method === "domicilio" && (!a.street?.trim() || !a.number?.trim())) return "Completá calle y número.";
  if (method === "sucursal" && !a.agencyCode) return "Elegí una sucursal de Correo.";
  return null;
}
