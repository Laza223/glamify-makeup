/** Fuente única de datos del negocio para páginas legales/contenido.
 *  Completar los [COMPLETAR] antes del launch (ver docs/LAUNCH.md). */
export const PLACEHOLDER_PREFIX = "[COMPLETAR";

export const businessInfo = {
  legalName: "Glamify Makeup",
  taxId: "27-44380532-5",
  taxCondition: "Monotributista Social",
  address: "Luján, Buenos Aires, Argentina",
  email: "gglamifymakeup@gmail.com",
  // El nº de WhatsApp se sirve desde Setting.whatsappNumber (DB); no duplicar acá.
  jurisdiction: "tribunales ordinarios correspondientes al domicilio de la parte consumidora",
  retractionDays: 10,
  // Se lee dentro de frases ("Aceptamos …", "Medios de pago: …"): sin dos puntos ni mayúscula inicial.
  paymentMethods: "tarjeta de crédito, débito o dinero en cuenta de Mercado Pago",
  /** Plazo de despacho: el mismo en toda la tienda. Se completa con "de acreditado el pago" donde entra. */
  dispatchWindow: "hasta 3 días hábiles",
  consumerDefenseUrl: "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario",
} as const;

export type BusinessInfo = typeof businessInfo;
