import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, EllipsisVertical, Share, SquarePlus, Smartphone } from "lucide-react";
import { Brand } from "@/components/brand";
import { InstallAppButton } from "@/components/install-app";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Instalar o app" };

/** Manual de instalação no Android e no iPhone (página pública: serve antes do login também). */
export default function InstallPage() {
  const host = new URL(SITE_URL).host;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <Brand />
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Instalar o Desafio Fitness</h1>
        <p className="mt-2 text-sm text-muted">
          Instalado, o app abre em tela cheia pelo ícone, como um aplicativo normal, e os avisos chegam com o nome e o
          ícone do Desafio Fitness. Não precisa de loja de aplicativos.
        </p>
      </header>

      <InstallAppButton />

      <Section title="Android (Chrome)" icon={<Smartphone className="h-5 w-5" aria-hidden />}>
        <Step n={1}>
          Abra <strong>{host}</strong> no <strong>Chrome</strong>. Em outros navegadores
          (Samsung Internet, Firefox) o caminho muda e os avisos podem não funcionar.
        </Step>
        <Step n={2}>
          Toque no menu <Inline icon={<EllipsisVertical className="h-4 w-4" aria-hidden />}>{null}</Inline> no canto de cima
          e escolha <strong>Instalar app</strong> (em alguns aparelhos aparece <strong>Adicionar à tela inicial</strong>{" "}
          → <strong>Instalar</strong>). Se apareceu o botão <strong>Instalar agora</strong> acima, ele faz o mesmo.
        </Step>
        <Step n={3}>
          Confirme. O ícone verde com a chama aparece na tela inicial e na gaveta de apps. A partir daqui,{" "}
          <strong>abra sempre pelo ícone</strong>.
        </Step>
        <Step n={4}>
          Dentro do app, toque em <strong>Ativar</strong> no aviso de notificações (ou em Mais → Notificações) e permita
          quando o Android perguntar.
        </Step>
      </Section>

      <Section title="Avisos no Android" icon={<Bell className="h-5 w-5" aria-hidden />}>
        <p className="text-sm text-muted">Se os avisos não chegam ou chegam atrasados:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
          <li>
            Configurações → <strong>Apps</strong> → <strong>Desafio Fitness</strong> (ou <strong>Chrome</strong>) →{" "}
            <strong>Notificações</strong>: deixe ativadas.
          </li>
          <li>
            Configurações → <strong>Bateria</strong>: deixe o Chrome <strong>sem restrição</strong>. Na Samsung, tire o
            Chrome da lista de <strong>Apps em suspensão</strong>; na Xiaomi, ative a <strong>Inicialização automática</strong>.
          </li>
          <li>
            Se o celular estiver em <strong>Não perturbe</strong> ou no modo economia de energia, os avisos esperam.
          </li>
          <li>Para testar, use o botão de aviso de teste em Mais → Notificações.</li>
        </ul>
      </Section>

      <Section title="iPhone (Safari)" icon={<Smartphone className="h-5 w-5" aria-hidden />}>
        <Step n={1}>
          Abra o site no <strong>Safari</strong> (no Chrome do iPhone os avisos não funcionam). O iPhone precisa estar no{" "}
          <strong>iOS 16.4 ou mais novo</strong>.
        </Step>
        <Step n={2}>
          Toque em <Inline icon={<Share className="h-4 w-4" aria-hidden />}>Compartilhar</Inline> na barra de baixo.
        </Step>
        <Step n={3}>
          Role e toque em <Inline icon={<SquarePlus className="h-4 w-4" aria-hidden />}>Adicionar à Tela de Início</Inline>{" "}
          → <strong>Adicionar</strong>.
        </Step>
        <Step n={4}>
          Abra pelo ícone na tela de início e toque em <strong>Ativar</strong> para receber os avisos.
        </Step>
      </Section>
    </main>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-accent">
        {n}
      </span>
      <p className="text-sm leading-6 text-foreground/90">{children}</p>
    </div>
  );
}

function Inline({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 align-middle font-semibold">
      {icon}
      {children}
    </span>
  );
}
