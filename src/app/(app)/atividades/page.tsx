import type { Metadata } from "next";
import Link from "next/link";
import { ActivityList } from "@/components/activity-list";
import { ButtonLink, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { listActivities } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import type { ActivityStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Atividades" };

const STATUS_TABS: { value: "todas" | ActivityStatus; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Contestadas" },
];

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; quem?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;

  const params = await searchParams;
  const status = (STATUS_TABS.find((t) => t.value === params.status)?.value ?? "todas") as
    | "todas"
    | ActivityStatus;
  const quem = params.quem === "eu" || params.quem === "parceiro" ? params.quem : "todos";
  const { challenge, user, partner } = viewer;

  const [all, pending] = await Promise.all([
    listActivities(user.id, challenge.id, {
      status: status === "todas" ? undefined : status,
      userId: quem === "eu" ? user.id : quem === "parceiro" && partner ? partner.id : undefined,
      limit: 120,
    }),
    listActivities(user.id, challenge.id, { status: "pending", limit: 50 }),
  ]);

  const waitingMine = pending.filter((a) => a.user_id !== user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atividades"
        subtitle="Histórico do casal, com comprovações."
        action={
          <ButtonLink href="/atividades/nova" className="hidden lg:inline-flex">
            Nova atividade
          </ButtonLink>
        }
      />

      {waitingMine.length > 0 ? (
        <section aria-labelledby="validar">
          <SectionTitle>
            <span id="validar">Aguardando sua validação ({waitingMine.length})</span>
          </SectionTitle>
          <ActivityList items={waitingMine} myId={user.id} />
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        <FilterRow label="Status">
          {STATUS_TABS.map((t) => (
            <FilterChip key={t.value} href={buildHref({ status: t.value, quem })} active={status === t.value}>
              {t.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Quem">
          {[
            { value: "todos", label: "Todos" },
            { value: "eu", label: "Eu" },
            { value: "parceiro", label: partner ? displayName(partner) : "Parceiro(a)" },
          ].map((o) => (
            <FilterChip key={o.value} href={buildHref({ status, quem: o.value })} active={quem === o.value}>
              {o.label}
            </FilterChip>
          ))}
        </FilterRow>
      </div>

      {all.length === 0 ? (
        <EmptyState title="Nenhuma atividade por aqui" description="Ajuste os filtros ou registre um treino.">
          <ButtonLink href="/atividades/nova">Registrar atividade</ButtonLink>
        </EmptyState>
      ) : (
        <ActivityList items={all} myId={user.id} />
      )}
    </div>
  );
}

function buildHref(p: { status: string; quem: string }) {
  const q = new URLSearchParams();
  if (p.status !== "todas") q.set("status", p.status);
  if (p.quem !== "todos") q.set("quem", p.quem);
  const s = q.toString();
  return s ? `/atividades?${s}` : "/atividades";
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs text-muted">{label}</span>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label={label}>
        {children}
      </nav>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
        active ? "border-accent bg-accent text-accent-ink" : "border-border text-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
