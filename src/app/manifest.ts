import type { MetadataRoute } from "next";

/** Manifest do app instalável (Android e iPhone "Adicionar à Tela de Início"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Desafio Fitness",
    short_name: "Desafio",
    description: "Competição fitness de casal: pontos por atividade e rankings.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
