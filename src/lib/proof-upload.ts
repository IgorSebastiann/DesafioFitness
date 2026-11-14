import { PROOF_IMAGE, toWebImage } from "@/lib/image";

/**
 * Regras de comprovação no navegador (UX). A segurança vem da rota de upload
 * (tipos e tamanho aceitos pelo Blob) e das regras do banco.
 */
export const MAX_PROOF_BYTES = 50 * 1024 * 1024;

const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/3gpp2", "video/x-m4v"];

// Alguns celulares mandam o arquivo sem tipo (comum com HEIC no Android); aí vale a extensão.
const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|3gp|3g2|m4v)$/i;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || (!file.type && IMAGE_EXT.test(file.name));
}

function isVideoFile(file: File): boolean {
  return VIDEO_TYPES.includes(file.type) || (!file.type && VIDEO_EXT.test(file.name));
}

export function validateProofFile(file: File): string | null {
  if (!isImageFile(file) && !isVideoFile(file)) {
    return "Formato não suportado. Envie uma foto ou um vídeo (MP4, MOV, WebM ou 3GP).";
  }
  if (file.size === 0) {
    return "O arquivo está vazio.";
  }
  // Fotos são reduzidas antes do envio; o limite vale para vídeos.
  if (!isImageFile(file) && file.size > MAX_PROOF_BYTES) {
    return "O vídeo passa de 50 MB. Grave um vídeo mais curto.";
  }
  return null;
}

export function proofKindFor(file: File | Blob): "image" | "video" {
  if (file instanceof File) return isImageFile(file) ? "image" : "video";
  return file.type.startsWith("video/") ? "video" : "image";
}

/** Fotos viram WebP/JPEG redimensionado; vídeos seguem sem conversão (limite de 50 MB). */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!isImageFile(file)) return file;
  return toWebImage(file, PROOF_IMAGE.maxSide, PROOF_IMAGE.quality);
}

const EXT_TYPES: Record<string, string> = {
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp", "3g2": "video/3gpp2", m4v: "video/x-m4v",
};

/** Tipo do arquivo para o envio; quando o celular não informa, deduz pela extensão. */
export function contentTypeFor(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? "application/octet-stream";
}
