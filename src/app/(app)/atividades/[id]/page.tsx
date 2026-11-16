import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Ruler } from "lucide-react";
import { ActivityDecisionPanel } from "@/components/activity-decision";
import { ActivityComments, ReactionBar } from "@/components/activity-social";
import { Avatar, Card, Notice, StatusBadge } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getActivityDetail, getPersonalRecords } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { formatDatePtBr, formatDurationMinutes, formatTimeShort } from "@/lib/time";

export const metadata: Metadata = { title: "Atividade" };

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criada?: string }>;
}) {
  const viewer = await getViewer();
  const { id } = await params;
  const { criada } = await searchParams;
  const detail = await getActivityDetail(viewer.userId, id);
  if (!detail) notFound();

  const { activity, proofUrl, history, reactions, comments } = detail;
  const mine = activity.user_id === viewer.user.id;
  const ownerName = activity.owner ? displayName(activity.owner) : "Participante";
  // Esta atividade é recorde pessoal (maior duração/distância da pessoa nesta modalidade)?
  const recordKinds =
    activity.status === "approved"
      ? (await getPersonalRecords(viewer.userId, activity.challenge_id))
          .filter((r) => r.activity_id === activity.id)
          .map((r) => (r.kind === "duration" ? "maior duração" : "maior distância"))
      : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/atividades" className="inline-flex w-fit items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
      </Link>

      {criada ? <Notice kind="success">Atividade registrada! Aguardando a validação do(a) parceiro(a).</Notice> : null}

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{activity.category?.name ?? "Atividade"}</p>
            <h1 className="mt-1 text-2xl font-bold">
              {formatDatePtBr(activity.activity_date)} · {formatTimeShort(activity.activity_time)}
            </h1>
          </div>
          <StatusBadge status={activity.status} />
        </div>

        {recordKinds.length > 0 ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1.5 text-sm font-semibold text-warning">
            <span aria-hidden>🏆</span> Recorde pessoal: {recordKinds.join(" e ")}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-2xl bg-surface-2">
          {proofUrl ? (
            activity.proof_kind === "video" ? (
              <video src={proofUrl} controls playsInline preload="metadata" className="max-h-[70vh] w-full bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofUrl} alt="Comprovação da atividade" className="max-h-[70vh] w-full object-contain" />
            )
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted">Comprovação indisponível</div>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Avatar name={ownerName} size={28} tone={mine ? "accent" : "partner"} />
            <div>
              <dt className="text-xs text-muted">Registrado por</dt>
              <dd className="font-medium">{mine ? "Você" : ownerName}</dd>
            </div>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" aria-hidden /> Duração
            </dt>
            <dd className="font-medium">{formatDurationMinutes(activity.duration_minutes)}</dd>
          </div>
          {activity.distance_km !== null ? (
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted">
                <Ruler className="h-3 w-3" aria-hidden /> Distância
              </dt>
              <dd className="font-medium">{Number(activity.distance_km).toLocaleString("pt-BR")} km</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted">Pontos válidos</dt>
            <dd className="font-semibold tabular-nums text-accent">{activity.points_awarded}</dd>
          </div>
          {activity.description ? (
            <div className="col-span-2">
              <dt className="text-xs text-muted">Observação</dt>
              <dd className="mt-0.5 whitespace-pre-line">{activity.description}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          <ReactionBar activityId={activity.id} viewerId={viewer.user.id} reactions={reactions} />
        </div>
      </Card>

      <ActivityDecisionPanel
        activity={activity}
        viewerId={viewer.user.id}
        isAdmin={viewer.isAdmin}
        canEditOwn={mine && activity.status === "pending"}
      />

      <ActivityComments activityId={activity.id} viewerId={viewer.user.id} comments={comments} />

      {history.length > 0 ? (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Histórico de validação</h2>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                <span className={h.decision === "approved" ? "font-semibold text-accent" : "font-semibold text-danger"}>
                  {h.decision === "approved" ? "Aprovada" : "Contestada"} por {displayName(h.reviewer)}
                </span>
                <span className="text-xs text-muted">
                  {new Date(h.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
                {h.note ? <span className="text-muted">“{h.note}”</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
