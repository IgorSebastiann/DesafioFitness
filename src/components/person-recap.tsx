import { CalendarDays, Clock, Flame, Heart, Ruler, Sunrise, Timer } from "lucide-react";
import { Avatar, Card } from "@/components/ui";
import type { Recap } from "@/lib/domain/recap";
import { formatDayMonth, formatDurationMinutes } from "@/lib/time";
import { cn } from "@/lib/cn";

/** Cartão da retrospectiva de uma pessoa: números do mês e curiosidades. */
export function PersonRecap({
  name,
  avatarUrl,
  isMe,
  points,
  recap,
}: {
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  points: number;
  recap: Recap;
}) {
  const color = isMe ? "text-accent" : "text-partner";
  const facts = [
    recap.favorite && { icon: Heart, label: "Modalidade favorita", value: `${recap.favorite.name} (${recap.favorite.count}x)` },
    recap.bestWeekday && { icon: CalendarDays, label: "Dia preferido", value: `${recap.bestWeekday.name.charAt(0).toUpperCase()}${recap.bestWeekday.name.slice(1)} (${recap.bestWeekday.count}x)` },
    recap.earliest && { icon: Sunrise, label: "Treino mais cedo", value: `${recap.earliest.time} em ${formatDayMonth(recap.earliest.date)}` },
    recap.longest && {
      icon: Timer,
      label: "Treino mais longo",
      value: `${formatDurationMinutes(recap.longest.minutes)} de ${recap.longest.name}`,
    },
  ].filter(Boolean) as { icon: typeof Heart; label: string; value: string }[];

  return (
    <Card className={cn("flex flex-col gap-5", isMe ? "border-accent/30" : "border-partner/30")}>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={avatarUrl} size={44} tone={isMe ? "accent" : "partner"} ring />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-lg font-bold", color)}>{name}</p>
          <p className="text-xs text-muted tabular-nums">{points} {points === 1 ? "ponto" : "pontos"} no mês</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Big icon={Flame} label="Atividades" value={String(recap.activities)} />
        <Big icon={CalendarDays} label="Dias ativos" value={String(recap.activeDays)} />
        <Big icon={Clock} label="Tempo total" value={recap.minutes ? formatDurationMinutes(recap.minutes) : "0"} />
        <Big
          icon={Ruler}
          label="Distância"
          value={`${recap.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}
        />
      </dl>

      {facts.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma atividade aprovada neste mês.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                <Icon className={cn("h-4 w-4", color)} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted">{label}</p>
                <p className="truncate text-sm font-semibold">{value}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Big({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <Icon className="h-4 w-4 text-muted" aria-hidden />
      <dd className="mt-2 text-xl font-bold tabular-nums leading-tight">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}
