import { ImageResponse } from "next/og";
import { getSessionUser } from "@/lib/session";
import { todayIso } from "@/lib/time";
import { ShareCard } from "@/lib/share-card";
import { loadShareCard, parseShareOptions } from "@/lib/share-card-data";
import { shareCardFonts } from "@/lib/share-card-fonts";

/**
 * Card de compartilhamento (1080x1350, formato de post/story).
 * ?periodo=semana|mes|geral&fotos=1&modalidades=1&tempo=1
 * Só para quem está logado; pontos, fotos e fotos de perfil passam pelo RLS do usuário.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });

  const options = parseShareOptions(new URL(request.url).searchParams);
  const data = await loadShareCard(user.id, todayIso(), options);
  if (!data || data.people.length === 0) return new Response("Sem desafio.", { status: 404 });

  return new ImageResponse(<ShareCard data={data} options={options} />, {
    width: 1080,
    height: 1350,
    fonts: await shareCardFonts(),
    headers: { "Cache-Control": "private, no-store" },
  });
}
