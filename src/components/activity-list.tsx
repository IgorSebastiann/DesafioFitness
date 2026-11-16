import Link from "next/link";
import { Camera, Clock, MessageCircle, Video } from "lucide-react";
import { Avatar, StatusBadge } from "@/components/ui";
import { displayName } from "@/lib/format";
import { formatDayMonth, formatDurationMinutes, formatTimeShort } from "@/lib/time";
import type { ActivityRow } from "@/lib/types";
import { cn } from "@/lib/cn";
import { TONE, toneOf, type Tone } from "@/lib/people";

/** Mesma rota de proofUrlFor (queries.ts): o servidor confere se a pessoa pode ver a comprovação. */
function proofUrl(path: string | null | undefined): string | null {
  return path ? `/api/proofs?p=${encodeURIComponent(path)}` : null;
}

export type ActivityWithProof = ActivityRow & { proofUrl?: string | null };

/** Lista compacta de atividades com a comprovação (foto ou vídeo) quando disponível. */
export function ActivityList({
  items,
  myId,
  tones = {},
  showOwner = true,
}: {
  items: ActivityWithProof[];
  myId: string;
  /** Cor de cada pessoa (id → tom). Sem o mapa, os outros usam a cor laranja. */
  tones?: Record<string, Tone>;
  showOwner?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => {
        const mine = a.user_id === myId;
        const ownerName = a.owner ? displayName(a.owner) : "Participante";
        const tone = mine ? "accent" : toneOf(tones, a.user_id);
        return (
          <li key={a.id} className="animate-rise">
            <Link
              href={`/atividades/${a.id}`}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-accent/40"
            >
              <ProofThumb url={a.proofUrl ?? proofUrl(a.proof_path)} kind={a.proof_kind} extra={a.extra_proof_count ?? 0} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {showOwner ? (
                    <Avatar name={ownerName} src={null} size={20} tone={tone} />
                  ) : null}
                  <p className="truncate font-semibold">{a.category?.name ?? "Atividade"}</p>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {showOwner ? <span className={TONE[tone].text}>{mine ? "Você" : ownerName}</span> : null}
                  <span>{formatDayMonth(a.activity_date)} · {formatTimeShort(a.activity_time)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{formatDurationMinutes(a.duration_minutes)}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status === "approved" ? (
                    <span className="text-xs font-semibold text-accent tabular-nums">+{a.points_awarded}</span>
                  ) : null}
                  {a.reaction_count ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted tabular-nums" aria-label={`${a.reaction_count} reações`}>
                      <span aria-hidden>🔥</span>
                      {a.reaction_count}
                    </span>
                  ) : null}
                  {a.comment_count ? (
                    <span
                      className={cn("inline-flex items-center gap-1 text-xs text-muted tabular-nums", !a.reaction_count && "ml-auto")}
                      aria-label={`${a.comment_count} comentários`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      {a.comment_count}
                    </span>
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

/** Miniatura da capa; com mais arquivos, mostra quantos a mais ("+2"). */
export function ProofThumb({ url, kind, extra = 0 }: { url: string | null; kind: "image" | "video"; extra?: number }) {
  return (
    <div className="relative shrink-0">
      <ThumbImage url={url} kind={kind} />
      {extra > 0 ? (
        <span
          className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums"
          aria-label={`mais ${extra} ${extra === 1 ? "arquivo" : "arquivos"}`}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function ThumbImage({ url, kind }: { url: string | null; kind: "image" | "video" }) {
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
      <div className={`${box} relative`}>
        {/* Primeiro quadro do vídeo como miniatura (#t força o iPhone a desenhar o quadro). */}
        <video
          src={`${url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          aria-label="Vídeo de comprovação"
          className="pointer-events-none h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Video className="h-5 w-5 text-white drop-shadow" aria-hidden />
        </span>
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
