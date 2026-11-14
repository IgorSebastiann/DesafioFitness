import { ImageResponse } from "next/og";
import { FlameMark } from "@/lib/brand-mark";

/**
 * Selo pequeno da barra de status do Android. O Android usa só o formato (canal alfa) e
 * pinta de branco: precisa ser a silhueta em fundo transparente. Com um ícone cheio,
 * aparecia um quadrado branco no lugar.
 */
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FlameMark size={84} color="#ffffff" filled />
      </div>
    ),
    { width: 96, height: 96, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
