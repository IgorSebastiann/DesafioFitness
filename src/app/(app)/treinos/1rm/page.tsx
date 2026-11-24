import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { OneRmCalculator } from "@/components/one-rm-calculator";

export const metadata: Metadata = { title: "Calculadora de 1RM" };

export default function OneRmPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link
        href="/treinos"
        className="-mb-4 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Treinos
      </Link>
      <PageHeader className="mb-0" title="Calculadora de 1RM" subtitle="A carga máxima estimada para uma repetição, pelas fórmulas de Epley e Brzycki." />
      <OneRmCalculator />
    </div>
  );
}
