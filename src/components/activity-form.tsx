"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Images, Loader2, Play, X } from "lucide-react";
import { createActivity } from "@/app/actions/activities";
import { DatePicker, ModalityPicker } from "@/components/activity-pickers";
import { Field, Notice, inputClass } from "@/components/ui";
import { upload } from "@vercel/blob/client";
import { ensureViewableImage, ImageConversionError } from "@/lib/image";
import {
  compressImageIfNeeded,
  contentTypeFor,
  MAX_PROOF_BYTES,
  proofKindFor,
  validateProofFile,
} from "@/lib/proof-upload";
import type { Category } from "@/lib/types";
import { addDays } from "@/lib/domain/periods";
import { formatDayMonth } from "@/lib/time";

/** Capa + até 4 extras (mesmo limite do servidor e do banco). */
const MAX_PROOFS = 5;

type Picked = { id: string; file: File; url: string; kind: "image" | "video" };

export function ActivityForm({
  categories,
  userId,
  today,
  minDate,
  nowTime,
  dailyLimit,
  pointsUsedByDate,
  prefill,
}: {
  categories: Category[];
  userId: string;
  /** Último dia permitido (hoje, ou o fim do desafio se já passou). */
  today: string;
  /** Primeiro dia do desafio. */
  minDate?: string;
  nowTime: string;
  dailyLimit: number;
  /** Pontos já usados em cada dia (YYYY-MM-DD), para o saldo da data escolhida. */
  pointsUsedByDate: Record<string, number>;
  /** Vindo do fim de um treino executado: modalidade, horário, duração e descrição já preenchidos. */
  prefill?: { categoryId?: string; time: string; durationMinutes: number; description: string; sessionIds: string[] };
}) {
  const [state, formAction, isSaving] = useActionState(createActivity, null);
  const [uploading, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [categoryId, setCategoryId] = useState(
    prefill?.categoryId && categories.some((c) => c.id === prefill.categoryId) ? prefill.categoryId : (categories[0]?.id ?? ""),
  );
  const [activityDate, setActivityDate] = useState(today);
  const formRef = useRef<HTMLFormElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const selected = categories.find((c) => c.id === categoryId);
  const remaining = Math.max(0, dailyLimit - (pointsUsedByDate[activityDate] ?? 0));
  const dayLabel =
    activityDate === today ? "Hoje" : activityDate === addDays(today, -1) ? "Ontem" : `Em ${formatDayMonth(activityDate)}`;

  function clearInputs() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function addFiles(list: FileList | null) {
    setUploadError(null);
    const chosen = Array.from(list ?? []);
    clearInputs();
    if (chosen.length === 0) return;
    const room = MAX_PROOFS - picked.length;
    const accepted: Picked[] = [];
    let lastError: string | null = chosen.length > room ? `Dá para enviar até ${MAX_PROOFS} arquivos por atividade.` : null;
    setPreparing(true);
    try {
      for (const original of chosen.slice(0, room)) {
        const error = validateProofFile(original);
        if (error) {
          lastError = error;
          continue;
        }
        let file = original;
        if (proofKindFor(original) === "image") {
          // HEIC (galeria Samsung com "alta eficiência") não aparece no Chrome: vira JPEG aqui.
          try {
            file = await ensureViewableImage(original);
          } catch (e) {
            lastError = e instanceof ImageConversionError ? e.message : "Falha ao abrir a foto. Tente outra.";
            continue;
          }
        }
        accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), kind: proofKindFor(file) });
      }
    } finally {
      setPreparing(false);
    }
    if (lastError) setUploadError(lastError);
    setPicked((old) => [...old, ...accepted].slice(0, MAX_PROOFS));
  }

  function removeFile(id: string) {
    setPicked((old) => {
      const gone = old.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return old.filter((p) => p.id !== id);
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    if (picked.length === 0) {
      setUploadError("Envie uma foto ou um vídeo como comprovação.");
      return;
    }

    startTransition(async () => {
      setUploadError(null);
      try {
        const bodies = await Promise.all(picked.map((p) => compressImageIfNeeded(p.file)));
        let proofs: { path: string; kind: "image" | "video" }[];
        try {
          proofs = await Promise.all(
            bodies.map(async (body) => {
              const extension = body.name.includes(".") ? body.name.split(".").pop()!.toLowerCase() : "bin";
              const path = `proofs/${userId}/${crypto.randomUUID()}.${extension}`;
              await upload(path, body, {
                access: "private",
                handleUploadUrl: "/api/proofs/upload",
                contentType: contentTypeFor(body),
              });
              return { path, kind: proofKindFor(body) };
            }),
          );
        } catch {
          setUploadError("Não foi possível enviar a comprovação. Verifique sua conexão e tente novamente.");
          return;
        }

        const data = new FormData(form);
        data.delete("proofCamera");
        data.delete("proofGallery");
        data.set("proofs", JSON.stringify(proofs));
        formAction(data);
      } catch (error) {
        setUploadError(
          error instanceof ImageConversionError ? error.message : "Falha ao preparar o arquivo. Tente outra foto.",
        );
      }
    });
  }

  const pending = uploading || isSaving || preparing;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {prefill ? <input type="hidden" name="workoutSessions" value={prefill.sessionIds.join(",")} /> : null}
      <ModalityPicker
        name="categoryId"
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        error={fieldErr(state, "categoryId")}
      />

      <DatePicker
        name="activityDate"
        value={activityDate}
        onChange={setActivityDate}
        max={today}
        min={minDate}
        error={fieldErr(state, "activityDate")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Horário" error={fieldErr(state, "activityTime")}>
          <input name="activityTime" type="time" defaultValue={prefill?.time ?? nowTime} required className={inputClass} />
        </Field>
        <Field
          label="Duração (min)"
          hint={selected ? `Mínimo: ${selected.min_duration_minutes} min` : undefined}
          error={fieldErr(state, "durationMinutes")}
        >
          <input
            name="durationMinutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            step={1}
            required
            defaultValue={prefill?.durationMinutes}
            placeholder={selected ? String(selected.min_duration_minutes) : "30"}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Distância (km)" hint="Opcional" error={fieldErr(state, "distanceKm")}>
          <input name="distanceKm" type="text" inputMode="decimal" placeholder="5,2" className={inputClass} />
        </Field>
      </div>

      <Field label="Descrição" hint="Opcional. Até 500 caracteres." error={fieldErr(state, "description")}>
        <textarea name="description" defaultValue={prefill?.description} rows={3} maxLength={500} className={`${inputClass} h-auto py-3`} placeholder="Ex.: treino de pernas com a Ana" />
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground/90">Comprovação</span>
          <span className="text-xs text-muted tabular-nums">
            {picked.length > 0 ? `${picked.length} de ${MAX_PROOFS}` : `Até ${MAX_PROOFS} fotos ou vídeos`}
          </span>
        </div>

        {/* Os inputs ficam fora da lista para continuarem montados quando ela muda. */}
        <input
          ref={cameraRef}
          name="proofCamera"
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        {/* Só tipos MIME: extensões (.heic etc.) fazem o Chrome do Android trocar a galeria
            de fotos por "Escolha uma ação" (Câmera/Arquivos). HEIC já entra em image/*. */}
        <input
          ref={galleryRef}
          name="proofGallery"
          type="file"
          multiple
          accept="image/*,video/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => addFiles(e.target.files)}
        />

        {picked.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-accent/40 bg-surface-2 p-4">
            <div className="grid grid-cols-2 gap-3">
              <SourceButton icon={Camera} title="Câmera" hint="Foto ou vídeo agora" onClick={() => cameraRef.current?.click()} />
              <SourceButton icon={Images} title="Galeria" hint="Escolha uma ou várias" onClick={() => galleryRef.current?.click()} />
            </div>
            <span className="text-center text-xs text-muted">
              Qualquer foto (JPG, PNG, HEIC, WebP...) ou vídeo curto até {Math.round(MAX_PROOF_BYTES / 1024 / 1024)} MB
            </span>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {picked.map((p, i) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                {p.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`Comprovação ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video src={`${p.url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 p-1">
                      <Play className="h-3 w-3 fill-white text-white" aria-hidden />
                    </span>
                  </>
                )}
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Capa</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeFile(p.id)}
                  aria-label={`Remover comprovação ${i + 1}`}
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
            {picked.length < MAX_PROOFS ? (
              <li className="grid aspect-square grid-rows-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/40 bg-surface-2 text-xs font-semibold text-accent"
                >
                  <Camera className="h-4 w-4" aria-hidden /> Câmera
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/40 bg-surface-2 text-xs font-semibold text-accent"
                >
                  <Images className="h-4 w-4" aria-hidden /> Galeria
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        Limite diário: <strong className="text-foreground">{dailyLimit} pontos</strong>. {dayLabel} você{" "}
        {remaining > 0 ? (
          <>
            ainda pode somar <strong className="text-accent">{remaining}</strong>.
          </>
        ) : (
          <strong className="text-danger">já atingiu o limite.</strong>
        )}{" "}
        Atividades que ultrapassem o limite são bloqueadas.
      </div>

      {uploadError ? <Notice kind="error">{uploadError}</Notice> : null}
      {state && !state.ok ? <Notice kind="error">{state.error}</Notice> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-base font-semibold text-accent-ink transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {preparing ? "Preparando foto..." : uploading ? "Enviando comprovação..." : "Registrando..."}
          </>
        ) : (
          "Registrar atividade"
        )}
      </button>
    </form>
  );
}

function SourceButton({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: typeof Camera;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl bg-surface-3 px-3 py-4 text-center transition hover:brightness-110 active:scale-[0.98]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

function fieldErr(state: { ok: boolean; fieldErrors?: Record<string, string> } | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}
