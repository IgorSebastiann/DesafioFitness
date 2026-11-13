import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Usuário da sessão atual (ou null). Valida o cookie no banco do Better Auth. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}
