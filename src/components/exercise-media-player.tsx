"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import {
  ANGLES,
  creditParts,
  licenseUrl,
  sortMedia,
  type MediaAngle,
} from "@/lib/domain/exercises";
import type { ExerciseMedia } from "@/lib/data/exercises";
import { cn } from "@/lib/cn";

/** Intervalo da troca entre posição inicial e final quando o exercício só tem fotos. */
const FLIP_MS = 1100;

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Player leve para o celular: vídeo em loop, sem som, inline, com poster, carregado só quando
 * aparece na tela. Troca de ângulo e botão de pausar. Com "reduzir movimento", mostra a imagem
 * parada e um botão de play. Fotos de início e fim do movimento se alternam como um quadro a quadro.
 */
export function ExerciseMediaPlayer({ media, exerciseName }: { media: ExerciseMedia[]; exerciseName: string }) {
  const sorted = sortMedia(media);
  const angles = (["front", "side", "back"] as const).filter((a) => sorted.some((m) => m.angle === a));
  const firstAngle = sorted[0]?.angle ?? "side";
  const [angle, setAngle] = useState<MediaAngle>(firstAngle);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  // null = segue a preferência do aparelho; true/false = escolha da pessoa.
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const playing = playChoice ?? !reduced;
  const [visible, setVisible] = useState(false);
  // Depois de aparecer uma vez, o arquivo continua carregado (não baixa de novo ao rolar).
  const [seen, setSeen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const items = sorted.filter((m) => m.angle === angle);
  const current = items[Math.min(index, items.length - 1)];
  const allImages = items.length > 1 && items.every((m) => m.kind === "image");

  // Só carrega/toca quando o player está na tela.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && playing) void video.play().catch(() => undefined);
    else video.pause();
  }, [visible, playing, current?.id]);

  // Quadro a quadro entre as fotos do mesmo ângulo.
  useEffect(() => {
    if (!allImages || !playing || !visible) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), FLIP_MS);
    return () => window.clearInterval(timer);
  }, [allImages, playing, visible, items.length]);

  if (!current) return null;

  const isMotion = current.kind === "video" || allImages;
  const credit = creditParts(current);
  const licenseHref = licenseUrl(current.license, current.license_version);
  const still = current.poster_url ?? (current.kind === "image" ? current.url : null);

  return (
    <figure className="flex flex-col gap-2">
      <div
        ref={boxRef}
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-2"
      >
        {current.kind === "video" ? (
          <video
            key={current.id}
            ref={videoRef}
            src={seen ? current.url : undefined}
            poster={current.poster_url ?? undefined}
            muted
            loop
            playsInline
            preload="none"
            aria-label={`Execução de ${exerciseName}, ${ANGLES[current.angle].toLowerCase()}`}
            className="h-full w-full object-contain"
          />
        ) : current.kind === "gif" && !playing && current.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.poster_url} alt={`${exerciseName}, imagem parada`} className="h-full w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seen ? current.url : (still ?? undefined)}
            alt={`${exerciseName}, ${ANGLES[current.angle].toLowerCase()}${items.length > 1 ? `, quadro ${index + 1} de ${items.length}` : ""}`}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        )}

        {isMotion || current.kind === "gif" ? (
          <button
            type="button"
            onClick={() => setPlayChoice(!playing)}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:bg-background"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {angles.length > 1 ? (
          <div role="group" aria-label="Ângulo" className="inline-flex rounded-xl border border-border bg-surface-2 p-1">
            {angles.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={angle === a}
                onClick={() => {
                  setAngle(a);
                  setIndex(0);
                }}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-xs font-semibold transition",
                  angle === a ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
                )}
              >
                {ANGLES[a]}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted">{ANGLES[current.angle]}</span>
        )}
        {items.length > 1 ? (
          <div role="group" aria-label="Quadro" className="flex gap-1">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={i === index}
                aria-label={`Quadro ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  setPlayChoice(false);
                }}
                className={cn(
                  "h-9 min-w-9 rounded-lg border text-xs font-semibold",
                  i === index ? "border-accent text-accent" : "border-border text-muted",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <figcaption className="text-xs text-muted">
        {credit.author} ·{" "}
        {licenseHref ? (
          <a href={licenseHref} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2 hover:text-foreground">
            {credit.license}
          </a>
        ) : (
          credit.license
        )}{" "}
        ·{" "}
        {current.source_url ? (
          <a href={current.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {credit.source}
          </a>
        ) : (
          credit.source
        )}
        {credit.edited ? <span className="block">{credit.edited}</span> : null}
      </figcaption>
    </figure>
  );
}
