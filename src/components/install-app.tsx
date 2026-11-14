"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Botão "Instalar agora" do Chrome/Android. Só aparece quando o navegador oferece a instalação
 * (evento beforeinstallprompt); no iPhone a instalação é sempre pelo menu Compartilhar.
 */
export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="rounded-xl bg-success/15 px-4 py-3 text-sm font-semibold text-success">App instalado! Abra pelo ícone na tela inicial.</p>;
  }
  if (!promptEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await promptEvent.prompt();
        await promptEvent.userChoice.catch(() => undefined);
        setPromptEvent(null);
      }}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-base font-semibold text-accent-ink active:scale-[0.99]"
    >
      <Download className="h-5 w-5" aria-hidden /> Instalar agora
    </button>
  );
}
