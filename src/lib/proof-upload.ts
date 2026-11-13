import { PROOF_IMAGE, toJpeg } from "@/lib/image";

/**
 * Regras de comprovação no navegador (UX). A segurança vem do bucket `proofs`
 * (tipos MIME e tamanho no Storage) e das políticas RLS de caminho.
 */
export const MAX_PROOF_BYTES = 50 * 1024 * 1024;

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function validateProofFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) {
    return "Formato não suportado. Use foto (JPG, PNG, WebP, HEIC) ou vídeo (MP4, MOV, WebM).";
  }
  if (file.size > MAX_PROOF_BYTES) {
    return "O arquivo passa de 50 MB. Grave um vídeo mais curto.";
  }
  if (file.size === 0) {
    return "O arquivo está vazio.";
  }
  return null;
}

export function proofKindFor(file: File | Blob): "image" | "video" {
  return file.type.startsWith("video/") ? "video" : "image";
}

/** Fotos viram JPEG redimensionado; vídeos seguem sem conversão (limite de 50 MB). */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return toJpeg(file, PROOF_IMAGE.maxSide, PROOF_IMAGE.quality);
}
