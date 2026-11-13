import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { SetupRequired } from "@/components/setup-required";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string; senha?: string }>;
}) {
  const params = await searchParams;
  if (!isConfigured()) return <SetupRequired />;
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";
  return (
    <LoginForm
      next={next}
      linkError={params.erro === "link"}
      passwordChanged={params.senha === "alterada"}
    />
  );
}
