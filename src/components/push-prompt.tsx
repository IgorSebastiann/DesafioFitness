"use client";

import { useEffect, useState } from "react";
import { BellRing, Share, SquarePlus, X } from "lucide-react";
import { push } from "@/lib/push-client";

type Kind = "ios-install" | "ask" | "blocked" | null;

function currentKind(): Kind {
  if (push.needsHomeScreenInstall()) return "ios-install";
  if (!push.isSupported()) return null;
  const permission = push.permission();
  if (permission === "default") return "ask";
  if (permission === "denied") return "blocked";
  return null;
}

/**
 * Faixa no topo do app para ligar as notificações do celular. Aparece em toda abertura
 * até a pessoa ativar; o X só esconde até a próxima abertura.
 * - iPhone numa aba do Safari: passo a passo para adicionar à tela de início.
 * - Permissão não decidida: botão "Ativar" (o pedido precisa vir de um toque).
 * - Permissão recusada: explica onde liberar (o navegador não pergunta de novo).
 * - Permissão já dada: reinscreve em silêncio.
 */
export function PushPrompt() {
  const [kind, setKind] = useState<Kind>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Lê o estado do aparelho depois da montagem (no servidor não existe navigator).
    const timer = window.setTimeout(() => {
      const next = currentKind();
      setKind(next);
      if (next === null && push.isSupported() && push.permission() === "granted") {
        push.subscribe().catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!kind) return null;

  const activate = async () => {
    setBusy(true);
    setMessage(null);
    const ok = await push.subscribe().catch(() => false);
    setBusy(false);
    if (!ok && push.permission() === "denied") {
      setMessage("Permissão negada. Libere nas configurações do navegador.");
    }
    setKind(currentKind());
  };

  return (
    <div
      role="region"
      aria-label="Notificações no celular"
      className="mb-6 flex gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4"
    >
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {kind === "blocked" ? "Notificações bloqueadas" : "Receba os avisos no celular"}
        </p>

        {kind === "ios-install" ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              No iPhone, as notificações só chegam com o app na tela de início:
            </p>
            <ol className="mt-2 space-y-1.5 text-sm text-muted">
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-foreground">1.</span> No Safari, toque em
                <Share className="inline h-4 w-4 text-[#007AFF]" aria-label="Compartilhar" />
                <span className="font-semibold text-foreground">Compartilhar</span>
              </li>
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-foreground">2.</span> Escolha
                <SquarePlus className="inline h-4 w-4 text-foreground" aria-hidden />
                <span className="font-semibold text-foreground">Adicionar à Tela de Início</span>
              </li>
              <li>
                <span className="font-semibold text-foreground">3.</span> Abra pelo ícone novo e toque em{" "}
                <span className="font-semibold text-foreground">Ativar</span>
              </li>
            </ol>
          </>
        ) : null}

        {kind === "ask" ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Saiba na hora quando o parceiro(a) registrar uma atividade, quando ela for validada e quando o período
              fechar, mesmo com o app fechado.
            </p>
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className="mt-3 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
            >
              {busy ? "Ativando…" : "Ativar"}
            </button>
          </>
        ) : null}

        {kind === "blocked" ? (
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Você não vai saber na hora dos avisos.{" "}
            {push.isIos() ? (
              <>
                Para liberar: <span className="font-semibold text-foreground">Ajustes do iPhone → Notificações → Desafio Fitness</span>.
              </>
            ) : (
              <>
                Para liberar: toque no ícone ao lado do endereço do site, abra{" "}
                <span className="font-semibold text-foreground">Permissões</span>, ative{" "}
                <span className="font-semibold text-foreground">Notificações</span> e recarregue a página.
              </>
            )}
          </p>
        ) : null}

        {message ? <p className="mt-2 text-xs text-danger">{message}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => setKind(null)}
        aria-label="Fechar aviso"
        className="self-start p-1 text-muted hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
