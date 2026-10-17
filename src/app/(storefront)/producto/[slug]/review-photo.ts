/** Reglas de la foto de una reseña: una sola fuente para el input, el texto de ayuda y la validación del server. */
export const REVIEW_PHOTO_MIME = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;
export const REVIEW_PHOTO_MAX_MB = 5;
export const REVIEW_PHOTO_MAX_BYTES = REVIEW_PHOTO_MAX_MB * 1024 * 1024;
export const REVIEW_PHOTO_FORMATS_LABEL = "PNG, JPG, WEBP o AVIF";

export function isReviewPhotoType(type: string): boolean {
  return (REVIEW_PHOTO_MIME as readonly string[]).includes(type);
}
