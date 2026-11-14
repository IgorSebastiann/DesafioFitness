import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone para a tela de início do iPhone (o iOS arredonda os cantos sozinho). */
export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={180} rounded={false} inset={0.58} />, { ...size });
}
