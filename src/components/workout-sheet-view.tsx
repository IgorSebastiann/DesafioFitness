import Link from "next/link";
import { Dumbbell } from "lucide-react";
import type { SheetBlock } from "@/lib/data/workouts";
import { BLOCK_KINDS, formatSeconds, prescription, restFor } from "@/lib/domain/workouts";
import { muscleName } from "@/lib/domain/exercises";
import { cn } from "@/lib/cn";

const KIND_STYLE: Record<SheetBlock["kind"], string> = {
  warmup: "bg-surface-3 text-muted",
  straight: "bg-accent/15 text-accent",
  biset: "bg-sky-400/15 text-sky-300",
  alternating: "bg-warning/15 text-warning",
  circuit: "bg-fuchsia-400/15 text-fuchsia-300",
};

export function BlockKindBadge({ kind }: { kind: SheetBlock["kind"] }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", KIND_STYLE[kind])}>{BLOCK_KINDS[kind].label}</span>
  );
}

export function ExerciseThumb({ url, size = 48 }: { url: string | null; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/90"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Dumbbell className="h-5 w-5 text-neutral-500" />
      )}
    </span>
  );
}

/** Lista os blocos da ficha, com o link de cada exercício para a biblioteca. */
export function WorkoutSheetView({ blocks }: { blocks: SheetBlock[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {blocks.map((block, index) => {
        const label = String(index + 1).padStart(2, "0");
        return (
          <li key={block.id} className="rounded-3xl border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted" aria-label={`Bloco ${index + 1}`}>
                {label}
              </span>
              <BlockKindBadge kind={block.kind} />
              {block.kind === "circuit" ? (
                <span className="text-xs text-muted">
                  {block.sets === 1 ? "1 volta" : `${block.sets} voltas`}
                  {block.rest_seconds ? ` · ${formatSeconds(block.rest_seconds)} entre voltas` : ""}
                </span>
              ) : block.kind !== "warmup" && restFor(block, block.items.at(-1)) > 0 ? (
                <span className="text-xs text-muted">Descanso {formatSeconds(restFor(block, block.items.at(-1)))}</span>
              ) : null}
            </div>
            {block.title ? <p className="text-sm">{block.title}</p> : null}
            {block.items.length ? (
              <ul className={cn("flex flex-col gap-2", block.title && "mt-3")}>
                {block.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/exercicios/${item.exercise_slug}`}
                      className="flex min-h-14 items-center gap-3 rounded-2xl p-1 -m-1 hover:bg-surface-2"
                    >
                      <ExerciseThumb url={item.thumb_url} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="line-clamp-2 font-medium">{item.exercise_name}</span>
                        <span className="text-xs text-muted">
                          {muscleName(item.primary_muscle)}
                          {item.load_kg != null ? ` · ${item.load_kg.toLocaleString("pt-BR")} kg` : ""}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{prescription(block, item)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {block.notes ? <p className="mt-3 text-xs text-muted">{block.notes}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
