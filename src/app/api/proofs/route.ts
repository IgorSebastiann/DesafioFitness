import { get } from "@vercel/blob";
import { type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { withUser } from "@/lib/db";

/**
 * Entrega a comprovação de uma atividade. Só responde se o usuário for do mesmo
 * desafio (o RLS de activities decide). O arquivo nunca é público.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });

  const pathname = request.nextUrl.searchParams.get("p") ?? "";
  if (!pathname.startsWith("proofs/")) return new Response("Não encontrado.", { status: 404 });

  const visible = await withUser(user.id, async (sql) => {
    const { rows } = await sql.query(`select 1 from activities where proof_path = $1
       union all
       select 1 from activity_extra_proofs where proof_path = $1
       limit 1`, [pathname]);
    return rows.length > 0;
  });
  if (!visible) return new Response("Não encontrado.", { status: 404 });

  const result = await get(pathname, { access: "private" });
  if (!result) return new Response("Não encontrado.", { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
