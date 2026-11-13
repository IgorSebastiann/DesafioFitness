import type { Metadata } from "next";
import { SignupForm } from "@/components/auth-forms";
import { SetupRequired } from "@/components/setup-required";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (!isConfigured()) return <SetupRequired />;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return <SignupForm next={safeNext} />;
}
