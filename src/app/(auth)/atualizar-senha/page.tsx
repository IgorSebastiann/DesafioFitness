import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth-forms";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Nova senha" };

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6">
        <Notice kind="error">Este link é inválido ou expirou. Solicite um novo link de recuperação.</Notice>
        <a href="/recuperar-senha" className="text-center text-sm font-semibold text-accent">Solicitar novo link</a>
      </div>
    );
  }
  return <UpdatePasswordForm token={token} />;
}
