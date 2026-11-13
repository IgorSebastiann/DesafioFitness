"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestPush } from "@/app/actions/push";
import { Card, Notice } from "@/components/ui";
import { push } from "@/lib/push-client";

type View = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

/** Ativa/desativa as notificações neste aparelho e envia um aviso de teste. */
export function PushSettings() {
  const [view, setView] = useState<View>("loading");
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    // Estado do aparelho lido depois da montagem (no servidor não existe navigator).
    const timer = window.setTimeout(() => {
      if (push.needsHomeScreenInstall()) return setView("ios-install");
      if (!push.isSupported()) return setView("unsupported");
      if (push.permission() === "denied") return setView("blocked");
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setView(sub ? "on" : "off");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const enable = () =>
    startTransition(async () => {
      setMessage(null);
      const ok = await push.subscribe();
      if (ok) {
        setView("on");
        setMessage({ kind: "success", text: "Notificações ativadas neste aparelho." });
      } else if (push.permission() === "denied") {
        setView("blocked");
      } else {
        setMessage({ kind: "error", text: "Não foi possível ativar. Tente de novo." });
      }
    });

  const disable = () =>
    startTransition(async () => {
      await push.unsubscribe();
      setView("off");
      setMessage({ kind: "info", text: "Notificações desativadas neste aparelho." });
    });

  const test = () =>
    startTransition(async () => {
      const result = await sendTestPush();
      if (result?.ok) {
        setMessage({ kind: "success", text: result.message ?? "Enviado." });
      } else {
        setMessage({ kind: "error", text: result?.ok === false ? result.error : "Não foi possível enviar." });
      }
    });

  return (
    <Card>
      <h2 className="font-semibold">Avisos no celular</h2>

      {view === "loading" ? <p className="mt-2 text-sm text-muted">Verificando…</p> : null}

      {view === "unsupported" ? (
        <p className="mt-2 text-sm text-muted">
          Este navegador não aceita notificações. No celular, use o Chrome (Android) ou o Safari (iPhone).
        </p>
      ) : null}

      {view === "ios-install" ? (
        <div className="mt-2 space-y-2 text-sm text-muted">
          <p>No iPhone, as notificações só funcionam com o app na tela de início:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>No Safari, toque em Compartilhar.</li>
            <li>Escolha &ldquo;Adicionar à Tela de Início&rdquo;.</li>
            <li>Abra o app pelo ícone novo e volte para esta tela.</li>
          </ol>
        </div>
      ) : null}

      {view === "blocked" ? (
        <p className="mt-2 text-sm text-muted">
          As notificações estão bloqueadas. No Android: toque no cadeado ao lado do endereço, depois em Permissões.
          No iPhone: Ajustes → Notificações → Desafio Fitness.
        </p>
      ) : null}

      {view === "off" ? (
        <div className="mt-3">
          <p className="text-sm text-muted">Ative para receber os avisos mesmo com o app fechado.</p>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {busy ? "Ativando…" : "Ativar notificações"}
          </button>
        </div>
      ) : null}

      {view === "on" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className="inline-flex h-11 items-center rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold disabled:opacity-60"
          >
            Enviar aviso de teste
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
          >
            Desativar neste aparelho
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3">
          <Notice kind={message.kind === "error" ? "error" : message.kind === "success" ? "success" : "info"}>
            {message.text}
          </Notice>
        </div>
      ) : null}
    </Card>
  );
}
