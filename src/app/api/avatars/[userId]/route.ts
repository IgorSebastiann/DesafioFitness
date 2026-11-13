import { get } from "@vercel/blob";
import { getSessionUser } from "@/lib/session";
import { withUser } from "@/lib/db";

/** Foto de perfil: visível a quem divide desafio com o usuário (RLS de profiles). */
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });

  const { userId } = await params;
  const path = await withUser(user.id, async (sql) => {
    const { rows } = await sql.query<{ avatar_path: string | null }>(
      `select avatar_path from profiles where id = $1`,
      [userId],
    );
    return rows[0]?.avatar_path ?? null;
  });
  if (!path || !path.startsWith(`avatars/${userId}/`)) return new Response("Não encontrado.", { status: 404 });

  const result = await get(path, { access: "private" });
  if (!result) return new Response("Não encontrado.", { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
