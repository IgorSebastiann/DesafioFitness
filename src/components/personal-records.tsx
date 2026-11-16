import Link from "next/link";
import { Card } from "@/components/ui";
import type { PersonalRecord } from "@/lib/data/queries";
import { formatDayMonth, formatDurationMinutes } from "@/lib/time";
import { cn } from "@/lib/cn";

/** Recordes de uma pessoa: maior duração e maior distância em cada modalidade. */
export function RecordsCard({ title, isMe, records }: { title: string; isMe: boolean; records: PersonalRecord[] }) {
  const names = [...new Set(records.map((r) => r.category_name))];
  return (
    <Card className="flex flex-col gap-3">
      <p className={cn("text-sm font-semibold", isMe ? "text-accent" : "text-partner")}>{title}</p>
      {names.length === 0 ? (
        <p className="text-sm text-muted">Nenhum recorde ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {names.map((name) => {
            const duration = records.find((r) => r.category_name === name && r.kind === "duration");
            const distance = records.find((r) => r.category_name === name && r.kind === "distance");
            return (
              <li key={name} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium">{name}</span>
                <div className="flex flex-wrap gap-2">
                  {duration ? <RecordChip record={duration} text={formatDurationMinutes(duration.value)} /> : null}
                  {distance ? (
                    <RecordChip
                      record={distance}
                      text={`${distance.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km`}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function RecordChip({ record, text }: { record: PersonalRecord; text: string }) {
  return (
    <Link
      href={`/atividades/${record.activity_id}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs transition hover:bg-surface-3"
    >
      <span aria-hidden>🏆</span>
      <span className="font-bold tabular-nums">{text}</span>
      <span className="text-muted">em {formatDayMonth(record.activity_date)}</span>
    </Link>
  );
}
