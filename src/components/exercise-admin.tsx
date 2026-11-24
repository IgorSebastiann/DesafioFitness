"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { ChevronDown, Loader2, Star, Trash2, Upload } from "lucide-react";
import { addOwnMedia, deleteMedia, saveExercise, updateMedia } from "@/app/actions/exercises";
import { Field, Notice, buttonStyles, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { ExerciseDetail, ExerciseMedia } from "@/lib/data/exercises";
import {
  ANGLES,
  CATEGORIES,
  EQUIPMENT,
  LEVELS,
  MECHANICS,
  MUSCLES,
  creditParts,
  sortMedia,
  type MediaAngle,
} from "@/lib/domain/exercises";
import { OWN_IMAGE, OWN_VIDEO, OWN_VIDEO_TYPES } from "@/lib/media-blob";
import { toWebImage } from "@/lib/image";
import { cn } from "@/lib/cn";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return <Notice kind="error">{state.error}</Notice>;
  return state.message ? <Notice kind="success">{state.message}</Notice> : null;
}

const selectClass = cn(inputClass, "appearance-none pr-10");
const textareaClass = cn(inputClass, "h-auto min-h-28 py-3 [field-sizing:content]");

/** Select nativo com a seta do padrão do app. */
function Select(props: React.ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select {...props} className={selectClass} />
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  );
}

function Options({ entries }: { entries: Record<string, string> }) {
  return (
    <>
      {Object.entries(entries).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </>
  );
}

/** Cadastro/edição dos dados do exercício (admin). */
export function ExerciseForm({ exercise }: { exercise?: ExerciseDetail }) {
  const [state, action] = useActionState(saveExercise, null);
  const [primary, setPrimary] = useState<string>(exercise?.primary_muscle ?? "chest");
  const muscleOptions = Object.fromEntries(MUSCLES.map((m) => [m.code, m.name]));

  return (
    <form action={action} className="flex flex-col gap-4">
      {exercise ? <input type="hidden" name="id" value={exercise.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <input name="name" defaultValue={exercise?.name} required minLength={3} maxLength={80} className={inputClass} />
        </Field>
        <Field label="Endereço (slug)" hint="Vazio = gerado pelo nome. Ex.: supino-reto-com-barra">
          <input name="slug" defaultValue={exercise?.slug} maxLength={80} className={inputClass} />
        </Field>
        <Field label="Músculo principal">
          <Select name="primaryMuscle" value={primary} onChange={(e) => setPrimary(e.target.value)}>
            <Options entries={muscleOptions} />
          </Select>
        </Field>
        <Field label="Equipamento">
          <Select name="equipment" defaultValue={exercise?.equipment ?? "dumbbell"}>
            <Options entries={EQUIPMENT} />
          </Select>
        </Field>
        <Field label="Nível">
          <Select name="level" defaultValue={exercise?.level ?? "beginner"}>
            <Options entries={LEVELS} />
          </Select>
        </Field>
        <Field label="Tipo">
          <Select name="mechanic" defaultValue={exercise?.mechanic ?? "compound"}>
            <Options entries={MECHANICS} />
          </Select>
        </Field>
        <Field label="Categoria">
          <Select name="category" defaultValue={exercise?.category ?? "strength"}>
            <Options entries={CATEGORIES} />
          </Select>
        </Field>
        <label className="flex h-12 items-center gap-2 self-end text-sm">
          <input name="isActive" type="checkbox" defaultChecked={exercise?.is_active ?? true} className="h-5 w-5 accent-[#c6ff3d]" />
          Ativo (visível para todos)
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-foreground/90">Músculos secundários</legend>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLES.filter((m) => m.code !== primary).map((m) => (
            <label
              key={m.code}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-3 text-xs has-[:checked]:border-accent has-[:checked]:text-accent"
            >
              <input
                type="checkbox"
                name="secondaryMuscles"
                value={m.code}
                defaultChecked={exercise?.secondary_muscles.includes(m.code)}
                className="h-4 w-4 accent-[#c6ff3d]"
              />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Execução passo a passo" hint="Um passo por linha.">
        <textarea name="steps" rows={6} defaultValue={exercise?.steps.join("\n")} required className={textareaClass} />
      </Field>
      <Field label="Erros comuns" hint="Um por linha.">
        <textarea name="commonMistakes" rows={4} defaultValue={exercise?.common_mistakes.join("\n")} className={textareaClass} />
      </Field>
      <Field label="Dicas de postura e respiração" hint="Uma por linha.">
        <textarea name="tips" rows={4} defaultValue={exercise?.tips.join("\n")} className={textareaClass} />
      </Field>

      <Feedback state={state} />
      <SubmitButton pendingLabel="Salvando...">{exercise ? "Salvar alterações" : "Criar exercício"}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Mídias
// ---------------------------------------------------------------------------
type Picked = { file: File; kind: "video" | "image"; durationMs: number | null; width: number | null; height: number | null };

/** Lê duração e tamanho do vídeo e captura um quadro como poster (WebP/JPEG). */
async function inspectVideo(file: File): Promise<{ durationMs: number; width: number; height: number; poster: Blob | null }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Não foi possível ler este vídeo neste navegador."));
    });
    const durationMs = Math.round(video.duration * 1000);
    video.currentTime = Math.min(0.3, video.duration / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 2500);
    });
    const scale = Math.min(1, OWN_IMAGE.maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b && b.type === "image/webp" ? b : null), "image/webp", OWN_IMAGE.quality),
    ).then(
      (b) => b ?? new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", OWN_IMAGE.quality)),
    );
    return { durationMs, width: video.videoWidth, height: video.videoHeight, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const extOf = (type: string) =>
  ({ "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" })[type] ??
  "bin";

/** Envio de vídeos/fotos próprios e organização das mídias do exercício (admin). */
export function MediaManager({ exerciseId, slug, media }: { exerciseId: string; slug: string; media: ExerciseMedia[] }) {
  const [angle, setAngle] = useState<MediaAngle>("side");
  const [makePrimary, setMakePrimary] = useState(media.length === 0);
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const sorted = sortMedia(media);

  function onPick(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      setState(null);
      try {
        const isVideo = file.type.startsWith("video/");
        if (isVideo && !OWN_VIDEO_TYPES.includes(file.type)) {
          setState({ ok: false, error: "Envie o vídeo em MP4, MOV ou WebM." });
          return;
        }
        if (isVideo && file.size > OWN_VIDEO.maxBytes) {
          setState({ ok: false, error: "O vídeo passa de 20 MB. Grave um trecho mais curto (5 a 8 segundos)." });
          return;
        }
        let picked: Picked;
        let poster: Blob | null = null;
        let body: Blob = file;
        if (isVideo) {
          const info = await inspectVideo(file);
          if (info.durationMs > OWN_VIDEO.maxSeconds * 1000 + 500) {
            setState({ ok: false, error: `O vídeo tem ${Math.round(info.durationMs / 1000)} s. O limite é ${OWN_VIDEO.maxSeconds} s.` });
            return;
          }
          poster = info.poster;
          picked = { file, kind: "video", durationMs: info.durationMs, width: info.width, height: info.height };
        } else {
          body = await toWebImage(file, OWN_IMAGE.maxSide, OWN_IMAGE.quality);
          picked = { file, kind: "image", durationMs: null, width: null, height: null };
        }

        const id = crypto.randomUUID();
        const contentType = body.type || file.type;
        const main = await upload(`exercises/${slug}/own-${id}.${extOf(contentType)}`, body, {
          access: "public",
          handleUploadUrl: "/api/exercise-media/upload",
          contentType,
        });
        const posterBlob = poster
          ? await upload(`exercises/${slug}/own-${id}-poster.${extOf(poster.type)}`, poster, {
              access: "public",
              handleUploadUrl: "/api/exercise-media/upload",
              contentType: poster.type,
            })
          : null;

        const result = await addOwnMedia({
          exerciseId,
          kind: picked.kind,
          angle,
          url: main.url,
          posterUrl: posterBlob?.url ?? null,
          width: picked.width,
          height: picked.height,
          durationMs: picked.durationMs,
          makePrimary,
        });
        setState(result);
      } catch (error) {
        setState({ ok: false, error: (error as Error).message || "Falha no envio. Tente novamente." });
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function run(fn: () => Promise<ActionState>) {
    startTransition(async () => setState(await fn()));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
        <p className="text-sm text-muted">
          Vídeo curto gravado no celular (5 a 8 s, até {OWN_VIDEO.maxSeconds} s e 20 MB; MP4, MOV ou WebM) ou foto.
          Mídias próprias aparecem antes das de terceiros.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Ângulo da gravação" className="inline-flex rounded-xl border border-border bg-surface-2 p-1">
            {(["front", "side", "back"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={angle === a}
                onClick={() => setAngle(a)}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-xs font-semibold",
                  angle === a ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
                )}
              >
                {ANGLES[a]}
              </button>
            ))}
          </div>
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" checked={makePrimary} onChange={(e) => setMakePrimary(e.target.checked)} className="h-5 w-5 accent-[#c6ff3d]" />
            Definir como principal
          </label>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,image/*"
          className="sr-only"
          id="own-media"
          onChange={(e) => onPick(e.target.files?.[0])}
          disabled={pending}
        />
        <label htmlFor="own-media" className={buttonStyles("secondary", "md", cn("w-fit cursor-pointer", pending && "pointer-events-none opacity-60"))}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {pending ? "Enviando..." : "Enviar vídeo ou foto"}
        </label>
      </div>

      <div aria-live="polite" className="empty:hidden">
        <Feedback state={state} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma mídia. Este exercício está na lista &quot;falta gravar&quot;.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((m) => {
            const credit = creditParts(m);
            const thumb = m.poster_url ?? (m.kind === "image" ? m.url : null);
            return (
              <li key={m.id} className="flex gap-3 rounded-2xl border border-border bg-surface-2 p-3">
                <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-3">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-foreground">
                    {m.kind === "video" ? "Vídeo" : m.kind === "gif" ? "GIF" : "Imagem"} · {ANGLES[m.angle]}
                    {m.is_primary ? <span className="ml-1.5 text-accent">principal</span> : null}
                  </span>
                  <span className="truncate text-muted">
                    {credit.author} · {credit.license} · {credit.source}
                  </span>
                  <div className="mt-auto flex flex-wrap gap-1">
                    <select
                      aria-label="Ângulo"
                      value={m.angle}
                      disabled={pending}
                      onChange={(e) => run(() => updateMedia({ mediaId: m.id, angle: e.target.value as MediaAngle }))}
                      className="h-9 rounded-lg border border-border bg-surface px-2 text-xs"
                    >
                      {(["front", "side", "back"] as const).map((a) => (
                        <option key={a} value={a}>
                          {ANGLES[a]}
                        </option>
                      ))}
                    </select>
                    {!m.is_primary ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => updateMedia({ mediaId: m.id, isPrimary: true }))}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2 text-muted hover:text-foreground"
                      >
                        <Star className="h-3.5 w-3.5" aria-hidden /> Principal
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("Remover esta mídia? O arquivo também será apagado.")) run(() => deleteMedia(m.id));
                      }}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-danger/30 px-2 text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remover
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
