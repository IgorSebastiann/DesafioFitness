import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A imagem do placar lê as fontes do disco: garante que elas vão junto para a Vercel.
  outputFileTracingIncludes: {
    "/api/share/semana": ["./src/assets/fonts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
