"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { fail, success, type ActionState } from "@/lib/action-state";

const emailSchema = z.email({ error: "Informe um e-mail válido." }).trim();
const passwordSchema = z.string().min(8, { error: "A senha precisa ter pelo menos 8 caracteres." });

/**
 * Mensagem para o usuário a partir do erro do Better Auth. Não confundimos limite de
 * tentativas ou problema de endereço com senha errada.
 */
function authErrorMessage(error: APIError, action: "signin" | "signup"): string {
  const code = error.body?.code ?? "";
  if (error.status === 429) return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "E-mail ou senha incorretos.";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.";
  }
  if (code === "INVALID_ORIGIN" || error.status === 403) {
    return "Não foi possível acessar pelo endereço atual. Abra o app pelo endereço oficial.";
  }
  console.error(`[auth:${action}]`, code, error.message);
  return action === "signin"
    ? "Não foi possível entrar agora. Tente de novo em instantes."
    : "Não foi possível criar a conta agora. Tente de novo em instantes.";
}

/** Só aceita caminhos internos para evitar redirecionamento aberto. */
function safeNext(value: FormDataEntryValue | null, fallback = "/dashboard"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return fail(email.error.issues[0].message, { email: "inválido" });
  const password = String(formData.get("password") ?? "");
  if (!password) return fail("Informe sua senha.", { password: "obrigatória" });

  try {
    await auth.api.signInEmail({
      body: { email: email.data, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) return fail(authErrorMessage(error, "signin"));
    throw error;
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("displayName") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return fail("O nome precisa ter entre 2 e 40 caracteres.", { displayName: "inválido" });
  }
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return fail(email.error.issues[0].message, { email: "inválido" });
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return fail(password.error.issues[0].message, { password: "curta" });

  try {
    await auth.api.signUpEmail({
      body: { email: email.data, password: password.data, name },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) return fail(authErrorMessage(error, "signup"));
    throw error;
  }
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return fail(email.error.issues[0].message, { email: "inválido" });

  try {
    await auth.api.requestPasswordReset({
      body: { email: email.data, redirectTo: `${SITE_URL}/atualizar-senha` },
    });
  } catch (error) {
    // Resposta neutra para quem pediu: não revela se o e-mail existe nem falhas de envio.
    // No servidor a falha fica registrada para diagnóstico.
    console.error("[auth:reset]", error instanceof Error ? error.message : error);
  }
  return success("Se o e-mail estiver cadastrado, você receberá o link para criar uma nova senha.");
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return fail("Link inválido ou expirado. Solicite um novo.");
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return fail(password.error.issues[0].message, { password: "curta" });
  if (formData.get("confirm") !== formData.get("password")) {
    return fail("As senhas não conferem.", { confirm: "diferente" });
  }

  try {
    await auth.api.resetPassword({ body: { newPassword: password.data, token } });
  } catch {
    return fail("Link inválido ou expirado. Solicite um novo.");
  }
  redirect("/login?senha=alterada");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
