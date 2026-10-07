/** Sin caracteres ambiguos (0/O, 1/I): el código se tipea a mano desde un mail. 32 símbolos → `byte % 32` no tiene sesgo. */
export const GIFT_CARD_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUP_LENGTH = 4;

function randomGroup(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GROUP_LENGTH));
  return Array.from(bytes, (b) => GIFT_CARD_CODE_ALPHABET[b % GIFT_CARD_CODE_ALPHABET.length]).join("");
}

/** Código de gift card `GIFT-XXXX-XXXX` (32^8 combinaciones, aleatorio criptográfico). Cumple `/^[A-Z0-9-]+$/`. */
export function generateGiftCardCode(): string {
  return `GIFT-${randomGroup()}-${randomGroup()}`;
}
