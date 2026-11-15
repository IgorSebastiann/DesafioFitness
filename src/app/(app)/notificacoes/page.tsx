import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, Bell, CheckCircle2, Medal, Crown, Flag, Circle, MessageCircle, Settings2, Smile, XCircle } from "lucide-react";
import { DailyReminderToggle } from "@/components/daily-reminder";
import { MarkAllReadButton } from "@/components/profile-forms";
import { PushSettings } from "@/components/push-settings";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getDailyReminder, listNotifications } from "@/lib/data/queries";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notificações" };

const KIND_ICON: Record<string, typeof Bell> = {
  activity_created: Circle,
  activity_approved: CheckCircle2,
  activity_rejected: XCircle,
  leadership_change: Crown,
  period_closed: Flag,
  achievement_unlocked: Medal,
  rules_changed: Settings2,
  reaction: Smile,
  comment: MessageCircle,
  daily_reminder: AlarmClock,
};

export default async function NotificationsPage() {
  const viewer = await getViewer();
  const [items, reminder] = await Promise.all([listNotifications(viewer.userId), getDailyReminder(viewer.userId)]);
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}
        action={<MarkAllReadButton disabled={unread === 0} />}
      />

      <PushSettings />
      <DailyReminderToggle enabled={reminder} />

      {items.length === 0 ? (
        <EmptyState title="Nenhuma notificação" description="Atividades, aprovações, liderança e conquistas aparecem aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => {
            const Icon = KIND_ICON[n.kind] ?? Bell;
            const content = (
              <Card className={cn("flex gap-4 p-4", !n.read_at && "border-accent/40")}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", n.read_at ? "bg-surface-2 text-muted" : "bg-accent/15 text-accent")}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body ? <p className="mt-0.5 text-sm text-muted">{n.body}</p> : null}
                  <p className="mt-2 text-xs text-muted">
                    {new Date(n.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </Card>
            );
            return (
              <li key={n.id}>
                {n.link ? <Link href={n.link} className="block transition hover:opacity-90">{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
