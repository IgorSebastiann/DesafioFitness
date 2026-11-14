/**
 * Converte fotos antes do envio. Motivo: fotos de celular têm 3 a 10 MB; redimensionadas
 * ficam em torno de 100 a 400 KB, sem perda visível para comprovação. A imagem vai para o
 * Blob (não para o banco), mas o espaço e a velocidade de carregamento agradecem.
 *
 * Formato: WebP quando o navegador sabe gerar (Chrome/Android, Edge, Firefox), que fica
 * ~30% menor que JPEG. O Safari do iPhone não codifica WebP no canvas (cairia em PNG),
 * então lá a foto sai em JPEG.
 *
 * Entrada: qualquer foto que o navegador consiga abrir (JPG, PNG, WebP, HEIC no iPhone,
 * AVIF, GIF, BMP...). O HEIC só abre no Safari; no Android a câmera já grava em JPG.
 */
export const PROOF_IMAGE = { maxSide: 1280, quality: 0.75 } as const;
export const AVATAR_IMAGE = { maxSide: 512, quality: 0.8 } as const;

export class ImageConversionError extends Error {}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Lê e redimensiona a imagem (respeitando a rotação do EXIF) e devolve WebP ou JPEG. */
export async function toWebImage(file: File, maxSide: number, quality: number): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageConversionError(
      "Não foi possível abrir esta foto neste aparelho. Tire a foto pela câmera do app ou escolha outra imagem (JPG ou PNG).",
    );
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageConversionError("Seu navegador não conseguiu preparar a imagem.");
  // Fundo escuro para PNG/GIF com transparência (JPEG não tem transparência).
  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const stem = file.name.replace(/\.[^.]+$/, "") || "foto";

  const webp = await encode(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") {
    return new File([webp], `${stem}.webp`, { type: "image/webp" });
  }
  const jpeg = await encode(canvas, "image/jpeg", quality);
  if (!jpeg || jpeg.type !== "image/jpeg") {
    throw new ImageConversionError("Não foi possível converter a imagem. Tente outra foto.");
  }
  return new File([jpeg], `${stem}.jpg`, { type: "image/jpeg" });
}
