"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Clock, Download, Dumbbell, Loader2, Share2, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Period = "semana" | "mes" | "geral";
type Options = { photos: boolean; modalities: boolean; time: boolean };

const PERIODS: { value: Period; label: string; file: string }[] = [
  { value: "semana", label: "Semana", file: "placar-da-semana" },
  { value: "mes", label: "Mês", file: "placar-do-mes" },
  { value: "geral", label: "Desafio", file: "placar-do-desafio" },
];

/** Sugestão de conteúdo para cada período (dá para mudar antes de compartilhar). */
const DEFAULTS: Record<Period, Options> = {
  semana: { photos: true, modalities: true, time: false },
  mes: { photos: true, modalities: false, time: true },
  geral: { photos: false, modalities: true, time: true },
};

function cardUrl(period: Period, o: Options) {
  const q = new URLSearchParams({
    periodo: period,
    fotos: o.photos ? "1" : "0",
    modalidades: o.modalities ? "1" : "0",
    tempo: o.time ? "1" : "0",
  });
  return `/api/share/card?${q}`;
}

/**
 * Botão "Compartilhar placar": abre uma folha para escolher o período (semana, mês ou desafio
 * inteiro) e o que aparece (fotos, modalidades, tempo), com prévia da imagem. No celular abre a
 * folha de compartilhar do sistema; onde não dá para compartilhar arquivo, baixa a imagem.
 */
export function ShareCardButton({ defaultPeriod = "semana" }: { defaultPeriod?: Period }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        Compartilhar placar
      </button>
      {open ? <ShareSheet initialPeriod={defaultPeriod} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareSheet({ initialPeriod, onClose }: { initialPeriod: Period; onClose: () => void }) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [options, setOptions] = useState<Options>(DEFAULTS[initialPeriod]);
  // Última imagem gerada (fica visível, apagada, enquanto a próxima é gerada).
  const [image, setImage] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const urlRef = useRef<string | null>(null);
  const key = cardUrl(period, options);
  const loading = image?.key !== key && failedKey !== key;
  const error = failedKey === key ? "Não foi possível gerar a imagem." : shareError;

  // Trava a rolagem, fecha com Esc e põe o foco no botão de fechar.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Gera a prévia a cada mudança; a mesma imagem é a que vai ser compartilhada.
  useEffect(() => {
    const controller = new AbortController();
    fetch(key, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("falha");
        const blob = await res.blob();
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setShareError(null);
        setFailedKey(null);
        setImage({ key, blob, url });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setFailedKey(key);
      });
    return () => controller.abort();
  }, [key]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const fileName = `${PERIODS.find((p) => p.value === period)!.file}.png`;

  function download() {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = fileName;
    link.click();
  }

  async function share() {
    if (!image) return;
    const file = new File([image.blob], fileName, { type: "image/png" });
    if (!navigator.canShare?.({ files: [file] })) {
      download();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({ files: [file], title: "Desafio Fitness", text: "Placar do Desafio Fitness 🔥" });
    } catch (e) {
      // Fechar a folha de compartilhar não é erro.
      if ((e as Error).name !== "AbortError") setShareError("Não foi possível compartilhar. Tente baixar a imagem.");
    } finally {
      setSharing(false);
    }
  }

  const toggles: { key: keyof Options; label: string; icon: typeof Camera }[] = [
    { key: "photos", label: "Fotos", icon: Camera },
    { key: "modalities", label: "Modalidades", icon: Dumbbell },
    { key: "time", label: "Tempo", icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <button type="button" aria-label="Fechar" onClick={onClose} className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className={cn(
          "animate-sheet absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-4 pt-3",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pt-5",
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-surface-3 sm:hidden" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="text-base font-bold">Compartilhar placar</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-muted hover:bg-surface-2">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div role="radiogroup" aria-label="Período" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={period === p.value}
              onClick={() => {
                setPeriod(p.value);
                setOptions(DEFAULTS[p.value]);
              }}
              className={cn(
                "rounded-full py-2 text-sm font-semibold transition",
                period === p.value ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Mostrar no card</legend>
          <div className="grid grid-cols-3 gap-2">
            {toggles.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={options[key]}
                onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
                className={cn(
                  "inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-semibold transition",
                  options[key] ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="relative mx-auto aspect-[4/5] w-[min(100%,calc(42dvh*0.8))] shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-2">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt="Prévia do card do placar" className={cn("h-full w-full object-cover transition", loading && "opacity-40")} />
          ) : null}
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Gerando a imagem">
              <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden />
            </span>
          ) : null}
          {error && !loading ? (
            <p role="alert" className="absolute inset-x-3 bottom-3 rounded-xl bg-danger/15 p-2 text-center text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 -mx-4 grid grid-cols-[1fr_auto] gap-2 bg-surface px-4 pt-1">
          <button
            type="button"
            onClick={share}
            disabled={!image || loading || sharing}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-base font-semibold text-accent-ink disabled:opacity-50"
          >
            {sharing ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Share2 className="h-5 w-5" aria-hidden />}
            Compartilhar
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!image || loading}
            aria-label="Baixar imagem"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border text-foreground disabled:opacity-50"
          >
            <Download className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
