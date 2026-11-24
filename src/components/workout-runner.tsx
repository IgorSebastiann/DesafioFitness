"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Pause, Play, Plus, SkipForward, Volume2, VolumeX } from "lucide-react";
import { abandonWorkout, finishWorkout, logSet } from "@/app/actions/workouts";
import { Notice, buttonStyles } from "@/components/ui";
import { BlockKindBadge, ExerciseThumb } from "@/components/workout-sheet-view";
import { buildSteps, clock, formatSeconds, type Step, type WorkoutBlock } from "@/lib/domain/workouts";
import { cn } from "@/lib/cn";

export type RunnerItem = WorkoutBlock["items"][number] & {
  id: string;
  exercise_name: string;
  exercise_slug: string;
  thumb_url: string | null;
};
export type RunnerBlock = Omit<WorkoutBlock, "items"> & { id: string; items: RunnerItem[] };
export type RunnerLog = { item_id: string | null; set_number: number; step: number; reps: number | null; load_kg: number | null };

type Done = { reps: number | null; load: number | null; seconds: number | null };
type Timer = { kind: "rest" | "work"; endsAt: number; total: number; label: string; paused: number | null };

const stepKey = (itemId: string, set: number, step: number) => `${itemId}:${set}:${step}`;
/** Relógio fora do componente (o React Compiler não aceita Date.now() no corpo dele). */
const nowMs = () => Date.now();
const deadline = (seconds: number) => nowMs() + seconds * 1000;

// Preferência de som (por aparelho). Lida com useSyncExternalStore para não divergir na hidratação.
const SOUND_KEY = "treino-som";
const soundListeners = new Set<() => void>();
function readSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}
function writeSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    // sem armazenamento: o aviso sonoro volta ao padrão na próxima vez
  }
  soundListeners.forEach((l) => l());
}
function subscribeSound(listener: () => void) {
  soundListeners.add(listener);
  return () => soundListeners.delete(listener);
}
const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

/** Bipe curto pelo Web Audio (sem arquivo de som). */
function useBeep() {
  const ctx = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    if (!ctx.current && typeof window !== "undefined" && "AudioContext" in window) ctx.current = new AudioContext();
    void ctx.current?.resume();
  }, []);
  const beep = useCallback((times = 2) => {
    const c = ctx.current;
    if (!c) return;
    for (let i = 0; i < times; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, c.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.3, c.currentTime + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.25 + 0.18);
      osc.connect(gain).connect(c.destination);
      osc.start(c.currentTime + i * 0.25);
      osc.stop(c.currentTime + i * 0.25 + 0.2);
    }
  }, []);
  return { unlock, beep };
}

/** Mantém a tela acesa durante o treino (quando o navegador permite). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        // Sem suporte ou bateria fraca: segue sem manter a tela acesa.
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

export function WorkoutRunner({
  sessionId,
  sheetId,
  startedAt,
  blocks,
  logs,
  lastLoads,
}: {
  sessionId: string;
  sheetId: string;
  startedAt: string;
  blocks: RunnerBlock[];
  logs: RunnerLog[];
  lastLoads: Record<string, number>;
}) {
  const steps = useMemo(() => buildSteps(blocks), [blocks]);
  const [done, setDone] = useState<Map<string, Done>>(
    () =>
      new Map(
        logs
          .filter((l) => l.item_id)
          .map((l) => [stepKey(l.item_id!, l.set_number, l.step), { reps: l.reps, load: l.load_kg, seconds: null }]),
      ),
  );
  const [inputs, setInputs] = useState<Record<string, { reps: string; load: string }>>({});
  const [warmups, setWarmups] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<Timer | null>(null);
  const [circuit, setCircuit] = useState<{ blockIndex: number; position: number } | null>(null);
  // null até o primeiro tique no navegador: o servidor não sabe a hora exata da hidratação.
  const [now, setNow] = useState<number | null>(null);
  const sound = useSyncExternalStore(subscribeSound, readSound, () => true);
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const { unlock, beep } = useBeep();
  useWakeLock();

  // O intervalo atualiza o relógio e chama o tratamento do fim do cronômetro (sempre a versão mais nova).
  const onTick = useRef<() => void>(() => undefined);
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(nowMs());
      onTick.current();
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const itemById = useMemo(() => new Map(blocks.flatMap((b) => b.items.map((i) => [i.id, i] as const))), [blocks]);

  const defaults = useCallback(
    (s: Step) => {
      const item = itemById.get(s.itemId)!;
      const load = item.load_kg ?? lastLoads[item.exercise_id];
      return {
        reps: s.targetReps != null ? String(s.targetReps) : "",
        load: load != null ? String(load).replace(".", ",") : "",
      };
    },
    [itemById, lastLoads],
  );
  const valueOf = (s: Step) => inputs[s.key] ?? defaults(s);

  const alert = useCallback(() => {
    if (sound) beep(2);
    navigator.vibrate?.([200, 100, 200]);
  }, [beep, sound]);

  const save = useCallback(
    async (s: Step, value: Done | null) => {
      setError(null);
      const result = await logSet({
        sessionId,
        itemId: s.itemId,
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        step: s.step,
        reps: value?.reps ?? null,
        loadKg: value?.load ?? null,
        durationSeconds: value?.seconds ?? null,
        done: value !== null,
      });
      if (result && !result.ok) {
        setError(result.error);
        setDone((m) => {
          const next = new Map(m);
          if (value) next.delete(s.key);
          return next;
        });
      }
    },
    [sessionId],
  );

  function toggleStep(s: Step) {
    unlock();
    const isDone = done.has(s.key);
    if (isDone) {
      setDone((m) => {
        const next = new Map(m);
        next.delete(s.key);
        return next;
      });
      void save(s, null);
      return;
    }
    const v = valueOf(s);
    const reps = toNum(v.reps);
    const load = toNum(v.load);
    if ((reps != null && !Number.isFinite(reps)) || (load != null && !Number.isFinite(load))) {
      setError("Use só números nas repetições e na carga.");
      return;
    }
    const value = { reps: reps != null ? Math.round(reps) : null, load, seconds: null };
    setDone((m) => new Map(m).set(s.key, value));
    void save(s, value);
    if (s.restAfter > 0) {
      setTimer({ kind: "rest", endsAt: deadline(s.restAfter), total: s.restAfter, label: "Descanso", paused: null });
    }
  }

  // ----- Circuito por tempo ------------------------------------------------------------
  const circuitSteps = useMemo(
    () => (circuit ? steps.filter((s) => s.blockIndex === circuit.blockIndex) : []),
    [circuit, steps],
  );

  function startCircuit(blockIndex: number) {
    unlock();
    const list = steps.filter((s) => s.blockIndex === blockIndex);
    const first = list.findIndex((s) => !done.has(s.key));
    const position = first === -1 ? 0 : first;
    const s = list[position];
    setCircuit({ blockIndex, position });
    setTimer({ kind: "work", endsAt: deadline(s.targetSeconds ?? 20), total: s.targetSeconds ?? 20, label: itemById.get(s.itemId)!.exercise_name, paused: null });
  }

  const advanceCircuit = useCallback(
    (completed: boolean) => {
      if (!circuit) return;
      const current = circuitSteps[circuit.position];
      if (completed && current && !done.has(current.key)) {
        const value = { reps: null, load: null, seconds: current.targetSeconds };
        setDone((m) => new Map(m).set(current.key, value));
        void save(current, value);
      }
      // Depois de um exercício, se ele tem descanso, descansa antes do próximo.
      if (timer?.kind === "work" && current?.restAfter) {
        setTimer({ kind: "rest", endsAt: deadline(current.restAfter), total: current.restAfter, label: "Descanso", paused: null });
        return;
      }
      const nextPos = circuit.position + 1;
      if (nextPos >= circuitSteps.length) {
        setCircuit(null);
        setTimer(null);
        return;
      }
      const next = circuitSteps[nextPos];
      setCircuit({ ...circuit, position: nextPos });
      setTimer({
        kind: "work",
        endsAt: deadline(next.targetSeconds ?? 20),
        total: next.targetSeconds ?? 20,
        label: itemById.get(next.itemId)!.exercise_name,
        paused: null,
      });
    },
    [circuit, circuitSteps, done, itemById, save, timer],
  );

  const remaining = timer ? (timer.paused ?? Math.max(0, (timer.endsAt - (now ?? timer.endsAt - timer.total * 1000)) / 1000)) : 0;

  // Fim do cronômetro: avisa e segue (circuito) ou só encerra (descanso).
  useEffect(() => {
    onTick.current = () => {
      if (!timer || timer.paused != null || nowMs() < timer.endsAt) return;
      alert();
      if (circuit) advanceCircuit(timer.kind === "work");
      else setTimer(null);
    };
  }, [timer, circuit, advanceCircuit, alert]);

  function pauseResume() {
    setTimer((t) =>
      t ? (t.paused != null ? { ...t, endsAt: deadline(t.paused), paused: null } : { ...t, paused: Math.max(0, (t.endsAt - nowMs()) / 1000) }) : t,
    );
  }

  function skip() {
    if (circuit) advanceCircuit(timer?.kind === "work");
    else setTimer(null);
  }

  function toggleSound() {
    const next = !sound;
    if (next) unlock();
    writeSound(next);
  }

  const total = steps.length;
  const completed = steps.filter((s) => done.has(s.key)).length;
  const elapsed = now == null ? null : (now - new Date(startedAt).getTime()) / 1000;

  function finish() {
    if (completed < total && !confirmFinish) {
      setConfirmFinish(true);
      return;
    }
    startFinish(async () => {
      const result = await finishWorkout(sessionId);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-48">
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className="font-mono text-2xl font-semibold tabular-nums"
            aria-label={elapsed == null ? "Tempo de treino" : `Tempo de treino ${clock(elapsed)}`}
          >
            {elapsed == null ? "–:––" : clock(elapsed)}
          </span>
          <span className="text-xs text-muted">
            {completed} de {total} séries
          </span>
        </div>
        <div
          className="h-2 w-24 overflow-hidden rounded-full bg-surface-3 sm:w-40"
          role="progressbar"
          aria-label="Séries feitas"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
        >
          <div className="h-full rounded-full bg-accent transition-[width] motion-reduce:transition-none" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? "Som dos avisos ligado" : "Som dos avisos desligado"}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground"
        >
          {sound ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {error ? <Notice kind="error">{error}</Notice> : null}

      <ol className="flex flex-col gap-4">
        {blocks.map((block, blockIndex) => {
          const blockSteps = steps.filter((s) => s.blockIndex === blockIndex);
          const blockDone = blockSteps.length > 0 && blockSteps.every((s) => done.has(s.key));
          const sets = [...new Set(blockSteps.map((s) => s.setNumber))];
          return (
            <li key={block.id} className={cn("rounded-3xl border bg-surface p-4", blockDone ? "border-accent/40" : "border-border")}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{String(blockIndex + 1).padStart(2, "0")}</span>
                <BlockKindBadge kind={block.kind} />
                {blockDone ? <Check className="h-4 w-4 text-accent" aria-label="Bloco concluído" /> : null}
              </div>

              {block.kind === "warmup" ? (
                <div className="flex flex-col gap-3">
                  {block.title ? <p className="text-sm">{block.title}</p> : null}
                  <button
                    type="button"
                    aria-pressed={warmups.has(block.id)}
                    onClick={() =>
                      setWarmups((s) => {
                        const next = new Set(s);
                        if (next.has(block.id)) next.delete(block.id);
                        else next.add(block.id);
                        return next;
                      })
                    }
                    className={buttonStyles(warmups.has(block.id) ? "primary" : "secondary", "md", "self-start")}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    {warmups.has(block.id) ? "Aquecimento feito" : "Marcar aquecimento"}
                  </button>
                </div>
              ) : (
                <>
                  <ul className="mb-3 flex flex-col gap-2">
                    {block.items.map((item, i) => {
                      const current =
                        circuit?.blockIndex === blockIndex && circuitSteps[circuit.position]?.itemId === item.id;
                      return (
                      <li key={item.id} aria-current={current ? "step" : undefined}>
                        <Link
                          href={`/exercicios/${item.exercise_slug}`}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-2xl hover:bg-surface-2",
                            current && "bg-accent/10 ring-2 ring-accent",
                          )}
                        >
                          <ExerciseThumb url={item.thumb_url} size={44} />
                          <span className="flex min-w-0 flex-col">
                            <span className="line-clamp-2 font-medium">
                              {block.kind === "biset" ? `${String.fromCharCode(65 + i)}. ` : ""}
                              {item.exercise_name}
                            </span>
                            <span className="text-xs text-muted">
                              {item.reps_scheme?.length
                                ? `${block.sets} × ${item.reps_scheme.join("/")}`
                                : item.duration_seconds
                                  ? formatSeconds(item.duration_seconds)
                                  : `${block.sets} × ${item.reps}`}
                              {item.notes ? ` · ${item.notes}` : ""} · ver execução
                            </span>
                          </span>
                        </Link>
                      </li>
                      );
                    })}
                  </ul>

                  {block.kind === "circuit" ? (
                    <div className="flex flex-col gap-3">
                      <ol className="flex flex-wrap gap-1.5" aria-label="Progresso do circuito">
                        {blockSteps.map((s, i) => (
                          <li
                            key={s.key}
                            className={cn(
                              "h-2 w-6 rounded-full",
                              done.has(s.key) ? "bg-accent" : circuit?.blockIndex === blockIndex && circuit.position === i ? "bg-accent/50" : "bg-surface-3",
                            )}
                          >
                            <span className="sr-only">
                              {itemById.get(s.itemId)!.exercise_name}, volta {s.setNumber}: {done.has(s.key) ? "feito" : "a fazer"}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {circuit?.blockIndex !== blockIndex ? (
                        <button type="button" onClick={() => startCircuit(blockIndex)} disabled={circuit !== null} className={buttonStyles("primary", "md", "self-start")}>
                          <Play className="h-4 w-4" aria-hidden />
                          {blockDone ? "Fazer o circuito de novo" : blockSteps.some((s) => done.has(s.key)) ? "Continuar circuito" : "Começar circuito"}
                        </button>
                      ) : (
                        <p className="text-sm text-muted">Circuito em andamento: acompanhe o cronômetro abaixo.</p>
                      )}
                    </div>
                  ) : (
                    <ol className="flex flex-col gap-3">
                      {sets.map((set) => (
                        <li key={set} className="flex flex-col gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Série {set}</span>
                          {blockSteps
                            .filter((s) => s.setNumber === set)
                            .map((s) => {
                              const item = itemById.get(s.itemId)!;
                              const isDone = done.has(s.key);
                              const v = isDone ? null : valueOf(s);
                              const label =
                                block.kind === "biset"
                                  ? `${String.fromCharCode(65 + block.items.findIndex((x) => x.id === item.id))}. ${item.exercise_name}`
                                  : block.kind === "alternating"
                                    ? `${s.targetReps} reps · ${s.step % 2 === 1 ? "pesada" : "leve"}`
                                    : null;
                              const a11y = `${item.exercise_name}, série ${set}${block.kind === "alternating" ? `, ${s.targetReps} repetições` : ""}`;
                              return (
                                <div
                                  key={s.key}
                                  className={cn(
                                    "flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2",
                                    isDone ? "border-accent/40 bg-accent/10" : "border-border bg-surface-2",
                                  )}
                                >
                                  {label ? <span className="line-clamp-2 w-full text-sm">{label}</span> : null}
                                  {s.targetSeconds && s.targetReps == null ? (
                                    <span className="flex-1 text-sm text-muted">{formatSeconds(s.targetSeconds)}</span>
                                  ) : (
                                    <label className="flex flex-1 items-center gap-2 text-sm">
                                      <span className="text-muted">Reps</span>
                                      <input
                                        aria-label={`Repetições: ${a11y}`}
                                        inputMode="numeric"
                                        value={isDone ? String(done.get(s.key)!.reps ?? "") : v!.reps}
                                        disabled={isDone}
                                        onChange={(e) => setInputs((m) => ({ ...m, [s.key]: { ...(m[s.key] ?? defaults(s)), reps: e.target.value } }))}
                                        className="h-11 w-16 rounded-xl border border-border bg-surface px-2 text-center text-base tabular-nums disabled:opacity-70"
                                      />
                                    </label>
                                  )}
                                  <label className="flex flex-1 items-center gap-2 text-sm">
                                    <span className="text-muted">kg</span>
                                    <input
                                      aria-label={`Carga em kg: ${a11y}`}
                                      inputMode="decimal"
                                      value={isDone ? String(done.get(s.key)!.load ?? "").replace(".", ",") : v!.load}
                                      disabled={isDone}
                                      placeholder="—"
                                      onChange={(e) => setInputs((m) => ({ ...m, [s.key]: { ...(m[s.key] ?? defaults(s)), load: e.target.value } }))}
                                      className="h-11 w-20 rounded-xl border border-border bg-surface px-2 text-center text-base tabular-nums disabled:opacity-70"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => toggleStep(s)}
                                    aria-pressed={isDone}
                                    aria-label={isDone ? `Desmarcar: ${a11y}` : `Marcar como feita: ${a11y}`}
                                    className={cn(
                                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                                      isDone ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted hover:text-foreground",
                                    )}
                                  >
                                    <Check className="h-5 w-5" aria-hidden />
                                  </button>
                                </div>
                              );
                            })}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
              {block.notes ? <p className="mt-3 text-xs text-muted">{block.notes}</p> : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2">
        {confirmFinish && completed < total ? (
          <Notice kind="info">
            Ainda {total - completed === 1 ? "falta 1 série" : `faltam ${total - completed} séries`}. Toque de novo para terminar mesmo assim.
          </Notice>
        ) : null}
        <button type="button" onClick={finish} disabled={finishing} className={buttonStyles("primary", "lg")}>
          {finishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}
          {confirmFinish && completed < total ? "Terminar mesmo assim" : "Terminar treino"}
        </button>
        <AbandonButton sessionId={sessionId} sheetId={sheetId} />
      </div>

      {timer ? (
        <div
          role="timer"
          aria-live="off"
          className="fixed inset-x-0 bottom-20 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate text-sm font-medium", timer.kind === "work" ? "text-accent" : "text-muted")}>{timer.label}</span>
              {circuit && timer.kind === "work" && circuitSteps[circuit.position + 1] ? (
                <span className="truncate text-xs text-muted">Depois: {itemById.get(circuitSteps[circuit.position + 1].itemId)!.exercise_name}</span>
              ) : null}
            </div>
            <span className="font-mono text-4xl font-semibold tabular-nums">{clock(Math.ceil(remaining))}</span>
            {timer.kind === "rest" && !circuit ? (
              <button
                type="button"
                onClick={() => setTimer((t) => (t ? { ...t, endsAt: t.endsAt + 15000, total: t.total + 15 } : t))}
                aria-label="Mais 15 segundos de descanso"
                className="flex h-11 items-center gap-1 rounded-xl px-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden />
                15 s
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseResume}
                aria-label={timer.paused != null ? "Continuar" : "Pausar"}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground"
              >
                {timer.paused != null ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
              </button>
            )}
            <button
              type="button"
              onClick={skip}
              aria-label={timer.kind === "rest" ? "Pular descanso" : "Pular exercício"}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <SkipForward className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AbandonButton({ sessionId, sheetId }: { sessionId: string; sheetId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return (
      <div className="flex justify-between gap-2">
        <Link href={`/treinos/${sheetId}`} className={buttonStyles("ghost", "md")}>
          Ver ficha
        </Link>
        <button type="button" onClick={() => setArmed(true)} className={buttonStyles("ghost", "md")}>
          Desistir do treino
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-3">
      <p className="text-sm">O treino de hoje fica como abandonado e não gera atividade. As séries feitas continuam no histórico.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setArmed(false)} className={buttonStyles("ghost", "md", "flex-1")}>
          Continuar treinando
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await abandonWorkout(sessionId)))}
          className={buttonStyles("danger", "md", "flex-1")}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Desistir
        </button>
      </div>
    </div>
  );
}
