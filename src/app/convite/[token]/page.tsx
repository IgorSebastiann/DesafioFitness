import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInviteButton } from "@/components/challenge-forms";
import { Card, Notice } from "@/components/ui";
import { Brand } from "@/components/brand";
import { getSessionUser } from "@/lib/session";
import { withUser } from "@/lib/db";

export const metadata: Metadata = { title: "Convite" };

/** Página pública do convite. O e-mail é conferido no servidor, nunca só na tela. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[0-9a-f]{48}$/.test(token);

  const preview = valid
    ? await withUser(null, async (sql) => {
        const { rows } = await sql.query<{
          challenge_name: string;
          inviter_name: string;
          invited_email: string;
          valid: boolean;
        }>(`select challenge_name, inviter_name, invited_email, valid from invitation_preview($1)`, [token]);
        return rows[0] ?? null;
      })
    : null;

  const user = await getSessionUser();
  const next = `/convite/${token}`;
  const emailMatches = Boolean(user && preview && user.email.toLowerCase() === preview.invited_email);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <Card>
          {!preview || !preview.valid ? (
            <>
              <h1 className="text-xl font-bold">Convite inválido ou expirado</h1>
              <p className="mt-2 text-sm text-muted">Peça a quem te convidou um novo convite.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">{preview.inviter_name} convidou você</h1>
              <p className="mt-2 text-sm text-muted">
                Para o desafio <span className="font-semibold text-foreground">{preview.challenge_name}</span>.
              </p>

              <div className="mt-6">
                {!user ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted">
                      Entre ou crie a conta com o <strong className="text-foreground">e-mail que recebeu o convite</strong>.
                    </p>
                    <Link
                      href={`/login?next=${encodeURIComponent(next)}`}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-accent-ink"
                    >
                      Já tenho conta
                    </Link>
                    <Link
                      href={`/cadastro?next=${encodeURIComponent(next)}`}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-6 font-semibold"
                    >
                      Criar conta
                    </Link>
                  </div>
                ) : emailMatches ? (
                  <AcceptInviteButton token={token} />
                ) : (
                  <Notice kind="error">
                    Este convite foi enviado para outro e-mail. Saia da conta atual e entre com o e-mail convidado.
                  </Notice>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
