import { twMerge } from "tailwind-merge";

/**
 * Junta classes e resolve conflitos do Tailwind (a última vence).
 * Ex.: cn("inline-flex", "hidden lg:inline-flex") deixa o botão oculto no celular.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
