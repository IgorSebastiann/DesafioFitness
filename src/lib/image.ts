/**
 * Converte fotos antes do envio. Motivo: fotos de celular têm 3 a 10 MB; redimensionadas
 * ficam em torno de 100 a 400 KB, sem perda visível para comprovação. A imagem vai para o
 * Blob (não para o banco), mas o espaço e a velocidade de carregamento agradecem.
 *
 * Formato: WebP quando o navegador sabe gerar (Chrome/Android, Edge, Firefox), que fica
 * ~30% menor que JPEG. O Safari do iPhone não codifica WebP no canvas (cairia em PNG),
 * então lá a foto sai em JPEG.
 *
 * Entrada: qualquer foto que o navegador consiga abrir (JPG, PNG, WebP, AVIF, GIF, BMP...)
 * e HEIC/HEIF. O Safari abre HEIC sozinho; o Chrome do Android não, e a galeria Samsung
 * grava em HEIC quando "Imagens de alta eficiência" está ligado. Para esses casos o
 * decodificador `heic-to` (WASM, ~3 MB) é carregado sob demanda, só quando aparece um HEIC.
 */
export const PROOF_IMAGE = { maxSide: 1280, quality: 0.75 } as const;
export const AVATAR_IMAGE = { maxSide: 512, quality: 0.8 } as const;

export class ImageConversionError extends Error {}

const OPEN_ERROR =
  "Não foi possível abrir esta foto neste aparelho. Tire a foto pela câmera do app ou escolha outra imagem (JPG ou PNG).";

// Marcas do cabeçalho "ftyp" usadas por HEIC/HEIF (não inclui AVIF, que o Chrome abre).
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/** Detecta HEIC/HEIF pelo conteúdo do arquivo (o celular nem sempre informa tipo ou extensão). */
export async function isHeifFile(file: Blob): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (head.length < 12) return false;
    const text = String.fromCharCode(...head);
    if (text.slice(4, 8) !== "ftyp") return false;
    const major = text.slice(8, 12);
    if (major === "avif" || major === "avis") return false;
    if (HEIF_BRANDS.has(major)) return true;
    // Marcas compatíveis vêm depois da versão (bytes 16 em diante).
    for (let i = 16; i + 4 <= head.length; i += 4) {
      if (HEIF_BRANDS.has(text.slice(i, i + 4))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function decodeHeif(file: Blob): Promise<ImageBitmap> {
  try {
    const { heicTo } = await import("heic-to");
    return await heicTo({ blob: file, type: "bitmap" });
  } catch {
    throw new ImageConversionError(OPEN_ERROR);
  }
}

/** Abre a foto como bitmap; se o navegador não entender HEIC, usa o decodificador próprio. */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (await isHeifFile(file)) return decodeHeif(file);
    throw new ImageConversionError(OPEN_ERROR);
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function stemOf(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || "foto";
}

/**
 * Se a foto for HEIC e o navegador não souber mostrá-la, devolve uma cópia em JPEG
 * (para a miniatura aparecer antes do envio). Qualquer outra foto volta como está.
 */
export async function ensureViewableImage(file: File): Promise<File> {
  if (!(await isHeifFile(file))) return file;
  try {
    // Safari abre HEIC sozinho: não precisa converter.
    (await createImageBitmap(file)).close();
    return file;
  } catch {
    const bitmap = await decodeHeif(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageConversionError("Seu navegador não conseguiu preparar a imagem.");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const jpeg = await encode(canvas, "image/jpeg", 0.92);
    if (!jpeg) throw new ImageConversionError(OPEN_ERROR);
    return new File([jpeg], `${stemOf(file)}.jpg`, { type: "image/jpeg" });
  }
}

/** Lê e redimensiona a imagem (respeitando a rotação do EXIF) e devolve WebP ou JPEG. */
export async function toWebImage(file: File, maxSide: number, quality: number): Promise<File> {
  const bitmap = await decode(file);

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

  const stem = stemOf(file);

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
