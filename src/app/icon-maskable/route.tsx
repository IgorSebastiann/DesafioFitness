import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/brand-mark";

/**
 * Ícone "maskable" do Android: fundo até a borda e a chama dentro da área segura (80% central),
 * porque cada fabricante recorta o ícone num formato (círculo, gota, quadrado).
 */
export function GET() {
  return new ImageResponse(<AppIconArt size={512} rounded={false} inset={0.46} />, {
    width: 512,
    height: 512,
    headers: { "Cache-Control": "public, max-age=86400, immutable" },
  });
}
