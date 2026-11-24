/**
 * Blob PÚBLICO das mídias de exercícios (store separado do Blob privado das comprovações).
 * Token em MEDIA_READ_WRITE_TOKEN; os arquivos ficam em exercises/{slug}/...
 */
export const MEDIA_PREFIX = "exercises/";

/** URL pública do store de mídias, aceita pelo banco (constraint da migration 0013). */
export const MEDIA_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/exercises\//;

export function isMediaUrl(url: string): boolean {
  return MEDIA_URL_PATTERN.test(url);
}

/** Limites dos vídeos próprios (checados no navegador e na emissão do token de upload). */
export const OWN_VIDEO = { maxBytes: 20 * 1024 * 1024, maxSeconds: 10 } as const;
export const OWN_IMAGE = { maxBytes: 5 * 1024 * 1024, maxSide: 1080, quality: 0.85 } as const;

export const OWN_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const OWN_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];
