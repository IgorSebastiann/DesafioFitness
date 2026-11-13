"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { createActivity } from "@/app/actions/activities";
import { Field, Notice, inputClass } from "@/components/ui";
import { upload } from "@vercel/blob/client";
import { ImageConversionError } from "@/lib/image";
import { compressImageIfNeeded, MAX_PROOF_BYTES, proofKindFor, validateProofFile } from "@/lib/proof-upload";
import type { Category } from "@/lib/types";

export function ActivityForm({
  categories,
  userId,
  today,
  nowTime,
  dailyLimit,
  pointsUsedToday,
}: {
  categories: Category[];
  userId: string;
  today: string;
  nowTime: string;
  dailyLimit: number;
  pointsUsedToday: number;
}) {
  const [state, formAction, isSaving] = useActionState(createActivity, null);
  const [uploading, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; kind: "image" | "video"; name: string } | null>(null);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = categories.find((c) => c.id === categoryId);
  const remaining = Math.max(0, dailyLimit - pointsUsedToday);

  function onFileChange(file: File | undefined) {
    setUploadError(null);
    if (preview) URL.revokeObjectURL(preview.url);
    if (!file) {
      setPreview(null);
      return;
    }
    const error = validateProofFile(file);
    if (error) {
      setUploadError(error);
      if (fileRef.current) fileRef.current.value = "";
      setPreview(null);
      return;
    }
    setPreview({ url: URL.createObjectURL(file), kind: proofKindFor(file), name: file.name });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    const file = fileRef.current?.files?.[0];
    if (!form) return;
    if (!file) {
      setUploadError("Envie uma foto ou um vídeo como comprovação.");
      return;
    }
    const error = validateProofFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    startTransition(async () => {
      setUploadError(null);
      try {
        const body = await compressImageIfNeeded(file);
        const extension = body.name.includes(".") ? body.name.split(".").pop()!.toLowerCase() : "bin";
        const path = `proofs/${userId}/${crypto.randomUUID()}.${extension}`;
        try {
          await upload(path, body, {
            access: "private",
            handleUploadUrl: "/api/proofs/upload",
            contentType: body.type,
          });
        } catch {
          setUploadError("Não foi possível enviar a comprovação. Verifique sua conexão e tente novamente.");
          return;
        }

        const data = new FormData(form);
        data.delete("proof");
        data.set("proofPath", path);
        data.set("proofKind", proofKindFor(body));
        formAction(data);
      } catch (error) {
        setUploadError(
          error instanceof ImageConversionError ? error.message : "Falha ao preparar o arquivo. Tente outra foto.",
        );
      }
    });
  }

  const pending = uploading || isSaving;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Field label="Modalidade" error={fieldErr(state, "categoryId")}>
        <select
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.points} {c.points === 1 ? "ponto" : "pontos"} · mín. {c.min_duration_minutes} min
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data" error={fieldErr(state, "activityDate")}>
          <input name="activityDate" type="date" defaultValue={today} max={today} required className={inputClass} />
        </Field>
        <Field label="Horário" error={fieldErr(state, "activityTime")}>
          <input name="activityTime" type="time" defaultValue={nowTime} required className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            placeholder={selected ? String(selected.min_duration_minutes) : "30"}
            className={inputClass}
          />
        </Field>
        <Field label="Distância (km)" hint="Opcional" error={fieldErr(state, "distanceKm")}>
          <input name="distanceKm" type="text" inputMode="decimal" placeholder="5,2" className={inputClass} />
        </Field>
      </div>

      <Field label="Descrição" hint="Opcional. Até 500 caracteres." error={fieldErr(state, "description")}>
        <textarea name="description" rows={3} maxLength={500} className={`${inputClass} h-auto py-3`} placeholder="Ex.: treino de pernas com a Ana" />
      </Field>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-foreground/90">Comprovação</span>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-accent/40 bg-surface-2 p-6 text-center transition hover:bg-surface-3">
          {preview ? (
            preview.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="Pré-visualização da comprovação" className="max-h-64 rounded-xl object-contain" />
            ) : (
              <video src={preview.url} controls playsInline className="max-h-64 rounded-xl" />
            )
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Camera className="h-7 w-7" aria-hidden />
              </span>
              <span className="font-semibold">Tirar foto ou escolher vídeo</span>
              <span className="text-xs text-muted">Foto ou vídeo curto · até {Math.round(MAX_PROOF_BYTES / 1024 / 1024)} MB</span>
            </>
          )}
          <input
            ref={fileRef}
            name="proof"
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => onFileChange(e.target.files?.[0])}
          />
        </label>
        {preview ? (
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="flex min-w-0 items-center gap-2 truncate"><ImagePlus className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{preview.name}</span></span>
            <button
              type="button"
              onClick={() => {
                onFileChange(undefined);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="flex items-center gap-1 text-danger"
            >
              <X className="h-4 w-4" aria-hidden /> Remover
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        Limite diário: <strong className="text-foreground">{dailyLimit} pontos</strong>. Hoje você ainda pode
        somar <strong className="text-accent">{remaining}</strong>. Atividades que ultrapassem o limite são bloqueadas.
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
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {uploading ? "Enviando comprovação..." : "Registrando..."}
          </>
        ) : (
          "Registrar atividade"
        )}
      </button>
    </form>
  );
}

function fieldErr(state: { ok: boolean; fieldErrors?: Record<string, string> } | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}
