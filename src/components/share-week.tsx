"use client";

import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";

/**
 * Compartilha o card do placar da semana. No celular abre a folha de compartilhar do sistema
 * (WhatsApp, Instagram...); onde não dá para compartilhar arquivo, baixa a imagem.
 */
export function ShareWeekButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/share/semana", { cache: "no-store" });
      if (!response.ok) throw new Error("falha");
      const blob = await response.blob();
      const file = new File([blob], "placar-da-semana.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Placar da semana", text: "Placar da semana no Desafio Fitness 🔥" });
        } catch (shareError) {
          // Fechar a folha de compartilhar não é erro.
          if ((shareError as Error).name !== "AbortError") throw shareError;
        }
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Não foi possível gerar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
        Compartilhar placar
      </button>
      {error ? <span role="alert" className="mt-1 text-xs text-danger">{error}</span> : null}
    </span>
  );
}
