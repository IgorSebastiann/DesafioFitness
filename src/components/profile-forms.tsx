"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { updateAvatar, updateProfile } from "@/app/actions/profile";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import { Avatar, Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { upload } from "@vercel/blob/client";
import { AVATAR_IMAGE, ImageConversionError, toJpeg } from "@/lib/image";
import type { ActionState } from "@/lib/action-state";

export function ProfileForm({ displayName, nickname }: { displayName: string; nickname: string | null }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nome completo">
        <input name="displayName" defaultValue={displayName} required minLength={2} maxLength={40} className={inputClass} />
      </Field>
      <Field label="Apelido" hint="Aparece no placar e no ranking.">
        <input name="nickname" defaultValue={nickname ?? ""} maxLength={20} className={inputClass} />
      </Field>
      <Feedback state={state} />
      <SubmitButton variant="secondary" pendingLabel="Salvando...">Salvar perfil</SubmitButton>
    </form>
  );
}

export function AvatarUploader({
  userId,
  name,
  currentUrl,
}: {
  userId: string;
  name: string;
  currentUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(file: File | undefined) {
    setError(null);
    setSuccess(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem passa de 5 MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    startTransition(async () => {
      try {
        const body = await toJpeg(file, AVATAR_IMAGE.maxSide, AVATAR_IMAGE.quality);
        const path = `avatars/${userId}/${crypto.randomUUID()}.jpg`;
        try {
          await upload(path, body, {
            access: "private",
            handleUploadUrl: "/api/proofs/upload",
            contentType: body.type,
          });
        } catch {
          setError("Não foi possível enviar a foto.");
          return;
        }
        const result = await updateAvatar(path);
        if (result?.ok === false) setError(result.error);
        else setSuccess("Foto atualizada.");
      } catch (error) {
        setError(
          error instanceof ImageConversionError ? error.message : "Falha ao enviar a foto. Tente novamente.",
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-5">
      <label className="relative cursor-pointer">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-accent" />
        ) : (
          <Avatar name={name} src={currentUrl} size={80} ring />
        )}
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          aria-label="Trocar foto de perfil"
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Foto de perfil</p>
        <p className="text-xs text-muted">Toque na foto para trocar. JPG, PNG ou WebP até 5 MB.</p>
        {error ? <div className="mt-2"><Notice kind="error">{error}</Notice></div> : null}
        {success ? <div className="mt-2"><Notice kind="success">{success}</Notice></div> : null}
      </div>
    </div>
  );
}

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => startTransition(async () => { await markAllNotificationsRead(); })}
      className="text-sm font-semibold text-accent disabled:text-muted"
    >
      {pending ? "Marcando..." : "Marcar todas como lidas"}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return <Notice kind="error">{state.error}</Notice>;
  return state.message ? <Notice kind="success">{state.message}</Notice> : null;
}
