/**
 * Converte fotos para JPEG antes do envio. Motivo: fotos de celular têm 3 a 10 MB;
 * em JPEG redimensionado ficam em torno de 150 a 400 KB, sem perda visível para
 * comprovação. A imagem vai para o Blob (não para o banco), mas o espaço e a
 * velocidade de carregamento agradecem.
 *
 * JPEG é usado de propósito: o Safari do iPhone não codifica WebP no canvas (cairia em PNG).
 */
export const PROOF_IMAGE = { maxSide: 1280, quality: 0.75 } as const;
export const AVATAR_IMAGE = { maxSide: 512, quality: 0.8 } as const;

export class ImageConversionError extends Error {}

/** Lê e redimensiona a imagem (respeitando a rotação do EXIF) e devolve um JPEG. */
export async function toJpeg(file: File, maxSide: number, quality: number): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageConversionError(
      "Não foi possível ler esta imagem. Tire a foto pela câmera do app ou escolha uma foto em JPG ou PNG.",
    );
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageConversionError("Seu navegador não conseguiu preparar a imagem.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob || blob.type !== "image/jpeg") {
    throw new ImageConversionError("Não foi possível converter a imagem. Tente outra foto.");
  }
  const stem = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${stem}.jpg`, { type: "image/jpeg" });
}
