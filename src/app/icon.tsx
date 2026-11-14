import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/brand-mark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Ícone do app (PNG gerado pela Next): usado no manifest e como imagem grande das notificações. */
export default function Icon() {
  return new ImageResponse(<AppIconArt size={512} rounded />, { ...size });
}
