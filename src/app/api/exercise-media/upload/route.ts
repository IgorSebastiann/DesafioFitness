import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/session";
import { withUser } from "@/lib/db";
import { MEDIA_PREFIX, OWN_IMAGE, OWN_IMAGE_TYPES, OWN_VIDEO, OWN_VIDEO_TYPES } from "@/lib/media-blob";

/**
 * Emite a permissão de upload direto do navegador para o Blob PÚBLICO de mídias.
 * Só para admin, só em exercises/{slug}/own-..., com tipos e tamanhos limitados.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const token = process.env.MEDIA_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: "Armazenamento de mídias não configurado." }, { status: 503 });

  const isAdmin = await withUser(user.id, async (sql) => {
    const { rows } = await sql.query<{ ok: boolean }>(`select public.is_admin() as ok`);
    return rows[0]?.ok === true;
  });
  if (!isAdmin) return NextResponse.json({ error: "Somente administradores." }, { status: 403 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        if (!new RegExp(`^${MEDIA_PREFIX}[a-z0-9-]+/own-[a-z0-9-]+\\.(mp4|mov|webm|webp|jpg|png)$`).test(pathname)) {
          throw new Error("Caminho de upload inválido.");
        }
        const isVideo = /\.(mp4|mov|webm)$/.test(pathname);
        return {
          allowedContentTypes: isVideo ? OWN_VIDEO_TYPES : OWN_IMAGE_TYPES,
          maximumSizeInBytes: isVideo ? OWN_VIDEO.maxBytes : OWN_IMAGE.maxBytes,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
