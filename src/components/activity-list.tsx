import Link from "next/link";
import { Camera, Clock, Video } from "lucide-react";
import { Avatar, StatusBadge } from "@/components/ui";
import { displayName } from "@/lib/format";
import { formatDayMonth, formatDurationMinutes, formatTimeShort } from "@/lib/time";
import type { ActivityRow } from "@/lib/types";
import { cn } from "@/lib/cn";

export type ActivityWithProof = ActivityRow & { proofUrl?: string | null };

/** Lista compacta de atividades com a comprovação (foto ou vídeo) quando disponível. */
export function ActivityList({
  items,
  myId,
  showOwner = true,
}: {
  items: ActivityWithProof[];
  myId: string;
  showOwner?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => {
        const mine = a.user_id === myId;
        const ownerName = a.owner ? displayName(a.owner) : "Participante";
        return (
          <li key={a.id} className="animate-rise">
            <Link
              href={`/atividades/${a.id}`}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-accent/40"
            >
              <ProofThumb url={a.proofUrl ?? null} kind={a.proof_kind} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {showOwner ? (
                    <Avatar name={ownerName} src={null} size={20} tone={mine ? "accent" : "partner"} />
                  ) : null}
                  <p className="truncate font-semibold">{a.category?.name ?? "Atividade"}</p>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {showOwner ? <span className={cn(mine ? "text-accent" : "text-partner")}>{mine ? "Você" : ownerName}</span> : null}
                  <span>{formatDayMonth(a.activity_date)} · {formatTimeShort(a.activity_time)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{formatDurationMinutes(a.duration_minutes)}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status === "approved" ? (
                    <span className="text-xs font-semibold text-accent tabular-nums">+{a.points_awarded}</span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ProofThumb({ url, kind }: { url: string | null; kind: "image" | "video" }) {
  const box = "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-3 text-muted";
  if (!url) {
    return (
      <div className={box} aria-label="Sem comprovação disponível">
        {kind === "video" ? <Video className="h-6 w-6" aria-hidden /> : <Camera className="h-6 w-6" aria-hidden />}
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={box}>
        <Video className="h-6 w-6 text-accent" aria-label="Vídeo de comprovação" />
      </div>
    );
  }
  return (
    <div className={box}>
      {/* URL assinada e temporária do bucket privado. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Comprovação da atividade" className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}
