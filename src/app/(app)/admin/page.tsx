import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryAdminForm, ProfileAdminForm } from "@/components/admin-forms";
import { Card, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getCategories, listAdminActivities, listAllProfiles, listAuditLogs } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { formatDayMonth } from "@/lib/time";

export const metadata: Metadata = { title: "Administração" };

/** Área global do administrador: modalidades, papéis, registros e auditoria. */
export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/dashboard");
  const uid = viewer.userId;

  const [profiles, categories, activities, audit] = await Promise.all([
    listAllProfiles(uid),
    getCategories(uid, false),
    listAdminActivities(uid, 25),
    listAuditLogs(uid, 25),
  ]);
  const nameById = new Map(profiles.map((p) => [p.id, displayName(p)]));

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Administração"
        subtitle="Modalidades, pontuação e correções. Os desafios são gerenciados por quem participa deles, em Meu desafio."
      />

      <section aria-labelledby="modalidades" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="modalidades">Modalidades e pontuação</span>
        </SectionTitle>
        <div className="flex flex-col gap-3">
          {categories.map((c) => (
            <Card key={c.id} className="p-4">
              <CategoryAdminForm category={c} />
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="papeis" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="papeis">Usuários e papéis</span>
        </SectionTitle>
        <div className="flex flex-col gap-3">
          {profiles.map((p) => (
            <Card key={p.id} className="p-4">
              <ProfileAdminForm profile={{ id: p.id, display_name: p.display_name, nickname: p.nickname, role: p.role }} />
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="registros" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="registros">Registros recentes</span>
        </SectionTitle>
        <Card className="p-2">
          <ul className="divide-y divide-border text-sm">
            {activities.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 p-3">
                <Link href={`/atividades/${a.id}`} className="min-w-0 flex-1 hover:text-accent">
                  <span className="font-medium">{a.category?.name ?? "Atividade"}</span>{" "}
                  <span className="text-muted">
                    · {a.owner ? displayName(a.owner) : "—"} · {formatDayMonth(a.activity_date)}
                  </span>
                </Link>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-labelledby="auditoria" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="auditoria">Auditoria</span>
        </SectionTitle>
        <Card className="p-2">
          {audit.length === 0 ? (
            <p className="p-3 text-sm text-muted">Nenhum registro de auditoria.</p>
          ) : (
            <ul className="divide-y divide-border font-mono text-xs">
              {audit.map((l) => (
                <li key={l.id} className="flex flex-wrap gap-x-3 gap-y-1 p-3">
                  <span className="text-muted">
                    {new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-semibold text-accent">{l.action}</span>
                  <span>{l.table_name}</span>
                  <span className="truncate text-muted">{l.record_id}</span>
                  <span className="text-muted">por {l.actor_id ? (nameById.get(l.actor_id) ?? "usuário") : "sistema"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
