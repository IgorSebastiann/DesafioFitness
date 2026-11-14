import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/session";

const PROOF_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/3gpp2", "video/x-m4v",
];
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PROOF_MAX = 50 * 1024 * 1024;
const AVATAR_MAX = 5 * 1024 * 1024;

/**
 * Emite a permissão de upload direto do navegador para o Blob privado.
 * Só aceita caminhos dentro da pasta do próprio usuário (proofs/ ou avatars/).
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const isProof = pathname.startsWith(`proofs/${user.id}/`);
        const isAvatar = pathname.startsWith(`avatars/${user.id}/`);
        if (!isProof && !isAvatar) throw new Error("Caminho de upload inválido.");
        return {
          allowedContentTypes: isProof ? PROOF_TYPES : AVATAR_TYPES,
          maximumSizeInBytes: isProof ? PROOF_MAX : AVATAR_MAX,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
