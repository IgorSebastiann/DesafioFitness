import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Bell, CalendarDays, ChevronRight, Gift, LogOut, Medal, ShieldCheck, Swords } from "lucide-react";
import { AvatarUploader, ProfileForm } from "@/components/profile-forms";
import { WeeklyGoalForm } from "@/components/weekly-goal-form";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getDashboard, getWeeklyGoal } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { SignOutForm } from "@/components/signout-form";
import { NoChallenge } from "@/components/no-challenge";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const viewer = await getViewer();
  const { profile, user, challenge, isAdmin } = viewer;
  const name = displayName(profile);
  const photo = avatarUrlFor(profile);

  const weeklyGoal = await getWeeklyGoal(user.id);
  let totalPoints = 0;
  let totalActivities = 0;
  if (challenge) {
    const data = await getDashboard(user.id, challenge);
    totalPoints = data.stats.totalPoints;
    totalActivities = data.stats.totalActivities;
  }

  const links = [
    { href: "/desafio", label: "Meu desafio", icon: Swords },
    { href: "/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
    { href: "/premiacoes", label: "Premiações", icon: Gift },
    { href: "/conquistas", label: "Conquistas", icon: Medal },
    { href: "/notificacoes", label: "Notificações", icon: Bell },
    ...(isAdmin ? [{ href: "/admin", label: "Administração", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <PageHeader title="Perfil" subtitle={user.email ?? undefined} />

      <Card className="flex flex-col gap-6">
        <AvatarUploader userId={user.id} name={name} currentUrl={photo} />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <p className="text-2xl font-extrabold text-accent tabular-nums">{totalPoints}</p>
            <p className="text-xs text-muted">Pontos acumulados</p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <p className="text-2xl font-extrabold tabular-nums">{totalActivities}</p>
            <p className="text-xs text-muted">Atividades aprovadas</p>
          </div>
        </div>
      </Card>

      {challenge ? (
        <>
          <Card>
            <WeeklyGoalForm goal={weeklyGoal} />
          </Card>
          <Card>
            <ProfileForm displayName={profile.display_name} nickname={profile.nickname} />
          </Card>
        </>
      ) : (
        <NoChallenge />
      )}

      <section aria-labelledby="atalhos">
        <SectionTitle>
          <span id="atalhos">Mais</span>
        </SectionTitle>
        <Card className="p-2">
          <ul className="divide-y divide-border">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-3.5 hover:bg-surface-2">
                  <Icon className="h-5 w-5 text-accent" aria-hidden />
                  <span className="flex-1 font-medium">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <SignOutForm className="lg:hidden">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-semibold text-muted hover:text-foreground">
          <LogOut className="h-4 w-4" aria-hidden /> Sair da conta
        </button>
      </SignOutForm>
    </div>
  );
}
