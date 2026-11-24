"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { saveSheet } from "@/app/actions/workouts";
import { Card, Field, Notice, buttonStyles, inputClass } from "@/components/ui";
import { BLOCK_KINDS, type BlockKind } from "@/lib/domain/workouts";
import { MUSCLES, type MuscleCode } from "@/lib/domain/exercises";
import { cn } from "@/lib/cn";

export type ExerciseOption = { id: string; name: string; primary_muscle: MuscleCode };

type ItemDraft = {
  key: string;
  exercise_id: string;
  mode: "reps" | "time";
  reps: string;
  scheme: string;
  seconds: string;
  load: string;
  rest: string;
  notes: string;
};

type BlockDraft = {
  key: string;
  kind: BlockKind;
  title: string;
  sets: string;
  rest: string;
  notes: string;
  items: ItemDraft[];
};

export type EditorInitial = {
  sheetId: string;
  name: string;
  description: string | null;
  blocks: Array<{
    kind: BlockKind;
    title: string | null;
    sets: number;
    rest_seconds: number | null;
    notes: string | null;
    items: Array<{
      exercise_id: string;
      reps: number | null;
      reps_scheme: number[] | null;
      duration_seconds: number | null;
      load_kg: number | null;
      rest_seconds: number | null;
      notes: string | null;
    }>;
  }>;
};

const key = () => crypto.randomUUID();
const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const toInt = (s: string) => (s.trim() === "" ? null : Math.round(Number(s.replace(",", "."))));
const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

const emptyItem = (kind: BlockKind): ItemDraft => ({
  key: key(),
  exercise_id: "",
  mode: kind === "circuit" ? "time" : "reps",
  reps: kind === "circuit" || kind === "alternating" ? "" : "15",
  scheme: kind === "alternating" ? "6/12" : "",
  seconds: kind === "circuit" ? "20" : "",
  load: "",
  rest: "",
  notes: "",
});

/** Quantos exercícios cada tipo de bloco pede (mín., máx.). */
const ITEM_RANGE: Record<BlockKind, [number, number]> = {
  warmup: [0, 0],
  straight: [1, 1],
  alternating: [1, 1],
  biset: [2, 2],
  circuit: [2, 12],
};

function fitItems(kind: BlockKind, items: ItemDraft[]): ItemDraft[] {
  const [min, max] = ITEM_RANGE[kind];
  const next = items.slice(0, max).map((i) => ({
    ...i,
    mode: kind === "circuit" ? ("time" as const) : kind === "alternating" ? ("reps" as const) : i.mode,
    seconds: kind === "circuit" && !i.seconds ? "20" : i.seconds,
    scheme: kind === "alternating" && !i.scheme ? "6/12" : i.scheme,
  }));
  while (next.length < min) next.push(emptyItem(kind));
  return next;
}

function toDraft(initial: EditorInitial): BlockDraft[] {
  return initial.blocks.map((b) => ({
    key: key(),
    kind: b.kind,
    title: b.title ?? "",
    sets: String(b.sets),
    rest: str(b.rest_seconds),
    notes: b.notes ?? "",
    items: b.items.map((i) => ({
      key: key(),
      exercise_id: i.exercise_id,
      mode: i.duration_seconds != null && i.reps == null && !i.reps_scheme ? "time" : "reps",
      reps: str(i.reps),
      scheme: i.reps_scheme?.join("/") ?? "",
      seconds: str(i.duration_seconds),
      load: i.load_kg == null ? "" : String(i.load_kg).replace(".", ","),
      rest: str(i.rest_seconds),
      notes: i.notes ?? "",
    })),
  }));
}

export function WorkoutEditor({ initial, exercises }: { initial: EditorInitial; exercises: ExerciseOption[] }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [blocks, setBlocks] = useState<BlockDraft[]>(() => toDraft(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const update = (k: string, fn: (b: BlockDraft) => BlockDraft) => setBlocks((bs) => bs.map((b) => (b.key === k ? fn(b) : b)));
  const updateItem = (bk: string, ik: string, patch: Partial<ItemDraft>) =>
    update(bk, (b) => ({ ...b, items: b.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) }));
  const move = (index: number, delta: number) =>
    setBlocks((bs) => {
      const next = [...bs];
      const [b] = next.splice(index, 1);
      next.splice(index + delta, 0, b);
      return next;
    });

  function addBlock(kind: BlockKind) {
    setBlocks((bs) => [
      ...bs,
      {
        key: key(),
        kind,
        title: "",
        sets: kind === "warmup" || kind === "circuit" ? "1" : "3",
        rest: kind === "warmup" ? "" : kind === "circuit" ? "0" : "60",
        notes: "",
        items: fitItems(kind, []),
      },
    ]);
  }

  function save() {
    setError(null);
    for (const [i, b] of blocks.entries()) {
      if (b.items.some((it) => !it.exercise_id)) {
        setError(`Bloco ${i + 1}: escolha o exercício.`);
        return;
      }
    }
    const payload = {
      sheetId: initial.sheetId,
      name,
      description: description.trim() || null,
      blocks: blocks.map((b) => ({
        kind: b.kind,
        title: b.title.trim() || null,
        sets: toInt(b.sets) ?? 1,
        rest_seconds: toInt(b.rest),
        notes: b.notes.trim() || null,
        items: b.items.map((it) => ({
          exercise_id: it.exercise_id,
          reps: b.kind === "alternating" || b.kind === "circuit" || it.mode === "time" ? null : toInt(it.reps),
          reps_scheme:
            b.kind === "alternating"
              ? it.scheme
                  .split(/[/,;\s]+/)
                  .filter(Boolean)
                  .map((n) => Math.round(Number(n)))
              : null,
          duration_seconds: b.kind === "circuit" || it.mode === "time" ? toInt(it.seconds) : null,
          load_kg: toNum(it.load),
          rest_seconds: toInt(it.rest),
          notes: it.notes.trim() || null,
        })),
      })),
    };
    if (payload.blocks.some((b) => b.items.some((i) => i.reps_scheme?.some((n) => !Number.isFinite(n))))) {
      setError("Na carga alternada, escreva as repetições separadas por barra, ex.: 6/12.");
      return;
    }
    start(async () => {
      const result = await saveSheet(payload);
      if (result && !result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/treinos/${initial.sheetId}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <Card className="flex flex-col gap-4">
        <Field label="Nome da ficha">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
        </Field>
        <Field label="Descrição" hint="Opcional. Objetivo, observações gerais.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            className={cn(inputClass, "h-auto min-h-20 py-3 [field-sizing:content]")}
          />
        </Field>
      </Card>

      {blocks.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          Nenhum bloco ainda. Comece por um aquecimento ou por um exercício.
        </p>
      ) : null}

      <ol className="flex flex-col gap-4">
        {blocks.map((b, index) => {
          const n = index + 1;
          const [, maxItems] = ITEM_RANGE[b.kind];
          return (
            <li key={b.key}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-mono text-sm text-muted">Bloco {String(n).padStart(2, "0")}</h2>
                  <div className="relative order-last w-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:max-w-60">
                    <select
                      aria-label={`Tipo do bloco ${n}`}
                      value={b.kind}
                      onChange={(e) => {
                        const kind = e.target.value as BlockKind;
                        update(b.key, (old) => ({ ...old, kind, items: fitItems(kind, old.items) }));
                      }}
                      className={cn(inputClass, "h-11 appearance-none pr-10 text-sm")}
                    >
                      {(Object.keys(BLOCK_KINDS) as BlockKind[]).map((k) => (
                        <option key={k} value={k}>
                          {BLOCK_KINDS[k].label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                  </div>
                  <div className="ml-auto flex gap-1">
                    <IconButton label={`Subir bloco ${n}`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Descer bloco ${n}`} disabled={index === blocks.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Remover bloco ${n}`} onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
                <p className="-mt-2 text-xs text-muted">{BLOCK_KINDS[b.kind].hint}</p>

                {b.kind === "warmup" ? (
                  <Field label="O que fazer">
                    <textarea
                      value={b.title}
                      onChange={(e) => update(b.key, (o) => ({ ...o, title: e.target.value }))}
                      maxLength={120}
                      rows={2}
                      placeholder="Ex.: mobilidade de ombros e 5 min de bicicleta leve"
                      className={cn(inputClass, "h-auto min-h-20 py-3 [field-sizing:content]")}
                    />
                  </Field>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={b.kind === "circuit" ? "Voltas" : "Séries"}>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={20}
                          value={b.sets}
                          onChange={(e) => update(b.key, (o) => ({ ...o, sets: e.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                      <Field label={b.kind === "circuit" ? "Descanso/volta (s)" : "Descanso (s)"}>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={900}
                          value={b.rest}
                          onChange={(e) => update(b.key, (o) => ({ ...o, rest: e.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <ol className="flex flex-col gap-3">
                      {b.items.map((it, i) => (
                        <li key={it.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-3">
                          <div className="flex items-end gap-2">
                            <div className="min-w-0 flex-1">
                              <Field label={b.items.length > 1 ? `Exercício ${i + 1}` : "Exercício"}>
                                <ExerciseSelect
                                  value={it.exercise_id}
                                  exercises={exercises}
                                  onChange={(id) => updateItem(b.key, it.key, { exercise_id: id })}
                                />
                              </Field>
                            </div>
                            {b.kind === "circuit" && b.items.length > 2 ? (
                              <IconButton
                                label={`Remover exercício ${i + 1} do bloco ${n}`}
                                onClick={() => update(b.key, (o) => ({ ...o, items: o.items.filter((x) => x.key !== it.key) }))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {b.kind === "alternating" ? (
                              <Field label="Repetições" hint="Ex.: 6/12">
                                <input
                                  value={it.scheme}
                                  onChange={(e) => updateItem(b.key, it.key, { scheme: e.target.value })}
                                  inputMode="numeric"
                                  className={inputClass}
                                />
                              </Field>
                            ) : b.kind === "circuit" || it.mode === "time" ? (
                              <Field label="Tempo (s)">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={5}
                                  max={3600}
                                  value={it.seconds}
                                  onChange={(e) => updateItem(b.key, it.key, { seconds: e.target.value })}
                                  className={inputClass}
                                />
                              </Field>
                            ) : (
                              <Field label="Repetições">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={300}
                                  value={it.reps}
                                  onChange={(e) => updateItem(b.key, it.key, { reps: e.target.value })}
                                  className={inputClass}
                                />
                              </Field>
                            )}
                            <Field label="Carga (kg)" hint="Opcional">
                              <input
                                inputMode="decimal"
                                value={it.load}
                                onChange={(e) => updateItem(b.key, it.key, { load: e.target.value })}
                                className={inputClass}
                              />
                            </Field>
                            <div className="col-span-2">
                              <Field label="Observação" hint="Opcional">
                                <input
                                  value={it.notes}
                                  maxLength={300}
                                  onChange={(e) => updateItem(b.key, it.key, { notes: e.target.value })}
                                  className={inputClass}
                                />
                              </Field>
                            </div>
                          </div>
                          {b.kind === "straight" || b.kind === "biset" ? (
                            <label className="flex min-h-11 items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={it.mode === "time"}
                                onChange={(e) =>
                                  updateItem(b.key, it.key, {
                                    mode: e.target.checked ? "time" : "reps",
                                    seconds: it.seconds || "30",
                                    reps: it.reps || "15",
                                  })
                                }
                                className="h-5 w-5 accent-[var(--color-accent)]"
                              />
                              Por tempo (ex.: prancha)
                            </label>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                    {b.kind === "circuit" && b.items.length < maxItems ? (
                      <button
                        type="button"
                        onClick={() => update(b.key, (o) => ({ ...o, items: [...o.items, emptyItem("circuit")] }))}
                        className={buttonStyles("ghost", "md", "self-start")}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Adicionar exercício ao circuito
                      </button>
                    ) : null}
                  </>
                )}
                <Field label="Observação do bloco" hint="Opcional">
                  <input
                    value={b.notes}
                    maxLength={300}
                    onChange={(e) => update(b.key, (o) => ({ ...o, notes: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </Card>
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="add-block" className="flex flex-col gap-2">
        <h2 id="add-block" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Adicionar bloco
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(BLOCK_KINDS) as BlockKind[]).map((k) => (
            <button key={k} type="button" onClick={() => addBlock(k)} className={buttonStyles("secondary", "md", "h-auto min-h-11 py-2")}>
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {BLOCK_KINDS[k].label}
            </button>
          ))}
        </div>
      </section>

      <div
        className="fixed inset-x-0 bottom-20 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div aria-live="polite" className="empty:hidden">
            {error ? <Notice kind="error">{error}</Notice> : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()} className={buttonStyles("ghost", "md", "flex-1 sm:flex-none")}>
              Cancelar
            </button>
            <button type="button" onClick={save} disabled={saving} className={buttonStyles("primary", "md", "flex-1")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Salvar ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Seletor nativo agrupado por músculo: acessível e com a lista própria do celular. */
function ExerciseSelect({ value, exercises, onChange }: { value: string; exercises: ExerciseOption[]; onChange: (id: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "appearance-none pr-10", !value && "text-muted")}
      >
        <option value="">Escolha o exercício…</option>
        {MUSCLES.map((m) => {
          const list = exercises.filter((e) => e.primary_muscle === m.code);
          if (!list.length) return null;
          return (
            <optgroup key={m.code} label={m.name}>
              {list.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
