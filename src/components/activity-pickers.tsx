"use client";

import { createElement, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bike,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  Flame,
  Footprints,
  Music,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { addDays, monthRange, parseIsoDate } from "@/lib/domain/periods";
import { formatDayMonth, formatMonthTitle } from "@/lib/time";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  bike: Bike,
  circle: Circle,
  dumbbell: Dumbbell,
  flame: Flame,
  footprints: Footprints,
  music: Music,
  waves: Waves,
};

/** Ícone da modalidade (o nome vem do banco; desconhecido vira o genérico). */
function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return createElement(ICONS[name] ?? Activity, { className, "aria-hidden": true });
}

function pointsLabel(points: number) {
  return `${points} ${points === 1 ? "ponto" : "pontos"}`;
}

// ---------------------------------------------------------------------------
// Modalidade: campo que abre uma folha com as opções em grade (nomes inteiros, quebrando linha).
// ---------------------------------------------------------------------------
export function ModalityPicker({
  name,
  categories,
  value,
  onChange,
  error,
}: {
  name: string;
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === value);
  const allSamePoints = categories.every((c) => c.points === categories[0]?.points);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${name}-label`} className="text-sm font-medium text-foreground/90">Modalidade</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-labelledby={`${name}-label ${name}-value`}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-xl border bg-surface-2 px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-accent/20",
          error ? "border-danger" : "border-border focus:border-accent",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <CategoryIcon name={selected?.icon ?? "activity"} className="h-5 w-5" />
        </span>
        <span id={`${name}-value`} className="min-w-0 flex-1">
          <span className="block break-words font-semibold leading-tight">{selected?.name ?? "Escolher modalidade"}</span>
          {selected ? (
            <span className="block text-xs text-muted">
              Mínimo de {selected.min_duration_minutes} min · {pointsLabel(selected.points)}
            </span>
          ) : null}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted" aria-hidden />
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={`${name}-sheet-title`}>
          <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div
            className={cn(
              "animate-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-border bg-surface",
              "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[30rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border",
            )}
          >
            <div className="px-4 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-3 sm:hidden" aria-hidden />
              <div className="flex items-center justify-between">
                <div>
                  <h2 id={`${name}-sheet-title`} className="text-base font-bold">Escolha a modalidade</h2>
                  {allSamePoints && categories[0] ? (
                    <p className="text-xs text-muted">Todas valem {pointsLabel(categories[0].points)}.</p>
                  ) : null}
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-full p-2 text-muted hover:bg-surface-2">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
            <ul
              className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-4 pt-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            >
              {categories.map((c) => {
                const active = c.id === value;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-full min-h-14 w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.98]",
                        active ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-accent/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          active ? "bg-accent text-accent-ink" : "bg-surface-3 text-accent",
                        )}
                      >
                        <CategoryIcon name={c.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-semibold leading-tight">{c.name}</span>
                        <span className="block text-xs text-muted">
                          mín. {c.min_duration_minutes} min{allSamePoints ? "" : ` · ${pointsLabel(c.points)}`}
                        </span>
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data: atalhos Hoje/Ontem e um calendário que abre logo abaixo do campo.
// ---------------------------------------------------------------------------
const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function DatePicker({
  name,
  value,
  onChange,
  max,
  min,
  error,
}: {
  name: string;
  value: string;
  onChange: (iso: string) => void;
  /** Último dia permitido (hoje, ou o fim do desafio). */
  max: string;
  min?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  const wrapRef = useRef<HTMLDivElement>(null);
  const yesterday = addDays(max, -1);
  const isOther = value !== max && value !== yesterday;

  // Fecha ao tocar fora do calendário.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const range = monthRange(`${month}-01`);
  const leading = (parseIsoDate(range.start).getUTCDay() + 6) % 7;
  const total = Number(range.end.slice(8));
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => addDays(range.start, i)),
  ];
  const canPrev = !min || range.start > min;
  const canNext = range.end < max;
  const shift = (delta: number) => {
    const d = parseIsoDate(`${month}-01`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition",
      active ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface-2 text-muted hover:text-foreground",
    );

  return (
    <div ref={wrapRef} className="relative flex flex-col gap-1.5">
      <span id={`${name}-label`} className="text-sm font-medium text-foreground/90">Data</span>
      <input type="hidden" name={name} value={value} />
      <div role="group" aria-labelledby={`${name}-label`} className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
        <button type="button" className={chip(value === max)} aria-pressed={value === max} onClick={() => { onChange(max); setOpen(false); }}>
          Hoje
        </button>
        <button
          type="button"
          className={chip(value === yesterday)}
          aria-pressed={value === yesterday}
          disabled={!!min && yesterday < min}
          onClick={() => { onChange(yesterday); setOpen(false); }}
        >
          Ontem
        </button>
        <button
          type="button"
          className={chip(isOther)}
          aria-expanded={open}
          onClick={() => {
            setMonth(value.slice(0, 7));
            setOpen((o) => !o);
          }}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          {isOther ? formatDayMonth(value) : "Outro dia"}
        </button>
      </div>
      {error ? <span className="text-xs text-danger">{error}</span> : null}

      {open ? (
        <div className="animate-rise mt-1 rounded-2xl border border-border bg-surface-2 p-3 shadow-xl shadow-black/40">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Mês anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-3 disabled:opacity-30">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <span className="text-sm font-semibold">{capitalize(formatMonthTitle(range.start))}</span>
            <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Próximo mês" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-3 disabled:opacity-30">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`b${i}`} />;
              const disabled = day > max || (!!min && day < min);
              const selected = day === value;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={formatDayMonth(day)}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                  className={cn(
                    "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition",
                    selected ? "bg-accent font-bold text-accent-ink" : "hover:bg-surface-3",
                    day === max && !selected && "ring-1 ring-accent/60",
                    disabled && "pointer-events-none text-muted/30",
                  )}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
