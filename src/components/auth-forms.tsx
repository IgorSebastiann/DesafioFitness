"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from "@/app/actions/auth";
import type { ActionState } from "@/lib/action-state";

function StateNotice({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return state.fieldErrors ? null : <Notice kind="error">{state.error}</Notice>;
  if (state.message) return <Notice kind="success">{state.message}</Notice>;
  return null;
}

function fieldError(state: ActionState, key: string): string | undefined {
  if (!state || state.ok || !state.fieldErrors?.[key]) return undefined;
  return state.error;
}

export function LoginForm({
  next,
  linkError,
  passwordChanged,
}: {
  next: string;
  linkError: boolean;
  passwordChanged: boolean;
}) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6">
      <div>
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse o placar do desafio.</p>
      </div>
      {linkError ? <Notice kind="error">Este link expirou ou já foi usado. Solicite um novo.</Notice> : null}
      {passwordChanged ? <Notice kind="success">Senha alterada. Entre com a nova senha.</Notice> : null}
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" error={fieldError(state, "email")}>
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Senha" error={fieldError(state, "password")}>
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <StateNotice state={state} />
      <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/recuperar-senha" className="text-muted hover:text-foreground">Esqueci a senha</Link>
        <Link href={next === "/dashboard" ? "/cadastro" : `/cadastro?next=${encodeURIComponent(next)}`} className="font-semibold text-accent">Criar conta</Link>
      </div>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, null);
  return (
    <form action={action} className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6">
      <div>
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">Depois você cria seu desafio e convida seu parceiro(a).</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <Field label="Nome" error={fieldError(state, "displayName")}>
        <input name="displayName" required minLength={2} maxLength={40} autoComplete="name" className={inputClass} />
      </Field>
      <Field label="E-mail" error={fieldError(state, "email")}>
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres." error={fieldError(state, "password")}>
        <PasswordInput name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <StateNotice state={state} />
      <SubmitButton pendingLabel="Criando conta...">Criar conta</SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent">Entrar</Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6">
      <div>
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted">Enviaremos um link para criar uma nova senha.</p>
      </div>
      <Field label="E-mail" error={fieldError(state, "email")}>
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <StateNotice state={state} />
      <SubmitButton pendingLabel="Enviando...">Enviar link</SubmitButton>
      <Link href="/login" className="text-center text-sm text-muted hover:text-foreground">Voltar ao login</Link>
    </form>
  );
}

export function UpdatePasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(updatePassword, null);
  return (
    <form action={action} className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6">
      <div>
        <h1 className="text-2xl font-bold">Nova senha</h1>
        <p className="mt-1 text-sm text-muted">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" error={fieldError(state, "password")}>
        <PasswordInput name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirmar senha" error={fieldError(state, "confirm")}>
        <PasswordInput name="confirm" autoComplete="new-password" required minLength={8} />
      </Field>
      <StateNotice state={state} />
      <SubmitButton pendingLabel="Salvando...">Salvar senha</SubmitButton>
    </form>
  );
}
