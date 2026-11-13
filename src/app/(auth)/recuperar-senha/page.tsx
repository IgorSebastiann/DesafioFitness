import type { Metadata } from "next";
import { ResetForm } from "@/components/auth-forms";
import { SetupRequired } from "@/components/setup-required";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetPage() {
  if (!isConfigured()) return <SetupRequired />;
  return <ResetForm />;
}
