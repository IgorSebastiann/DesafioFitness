"use client";

import {
  useActionState,
  useEffect,
  useOptimistic,
  useRef,
  useTransition,
} from "react";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import {
  addComment,
  deleteComment,
  toggleReaction,
} from "@/app/actions/social";
import { Avatar, Card, Notice } from "@/components/ui";
import { REACTIONS } from "@/lib/reactions";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/cn";

type ReactionRow = { emoji: string; user_id: string };
type CommentRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { display_name: string; nickname: string | null };
  avatarUrl: string | null;
};

/** Reações rápidas (toque para ligar/desligar), com resposta imediata na tela. */
export function ReactionBar({
  activityId,
  viewerId,
  reactions,
}: {
  activityId: string;
  viewerId: string;
  reactions: ReactionRow[];
}) {
  const [, startTransition] = useTransition();
  const [optimistic, toggle] = useOptimistic(
    reactions,
    (state, emoji: string) =>
      state.some((r) => r.emoji === emoji && r.user_id === viewerId)
        ? state.filter((r) => !(r.emoji === emoji && r.user_id === viewerId))
        : [...state, { emoji, user_id: viewerId }],
  );

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reações">
      {REACTIONS.map((emoji) => {
        const count = optimistic.filter((r) => r.emoji === emoji).length;
        const mine = optimistic.some(
          (r) => r.emoji === emoji && r.user_id === viewerId,
        );
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={mine}
            aria-label={`Reagir com ${emoji}${count ? `, ${count}` : ""}`}
            onClick={() =>
              startTransition(async () => {
                toggle(emoji);
                await toggleReaction(activityId, emoji);
              })
            }
            className={cn(
              "inline-flex h-10 min-w-12 items-center justify-center gap-1.5 rounded-full border px-3 text-lg transition active:scale-95",
              mine
                ? "border-accent bg-accent/15"
                : "border-border bg-surface-2 hover:bg-surface-3",
            )}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 ? (
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  mine ? "text-accent" : "text-muted",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ActivityComments({
  activityId,
  viewerId,
  comments,
}: {
  activityId: string;
  viewerId: string;
  comments: CommentRow[];
}) {
  const [state, action, pending] = useActionState(addComment, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section id="comentarios" className="scroll-mt-24">
      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          <MessageCircle className="h-4 w-4" aria-hidden /> Comentários
          {comments.length > 0 ? (
            <span className="tabular-nums">({comments.length})</span>
          ) : null}
        </h2>

        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nenhum comentário ainda. Mande um incentivo (ou uma provocação).
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {comments.map((c) => {
              const name = displayName(c.author);
              const mine = c.user_id === viewerId;
              return (
                <li key={c.id} className="flex gap-3">
                  <Avatar
                    name={name}
                    src={c.avatarUrl}
                    size={32}
                    tone={mine ? "accent" : "partner"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold">
                        {mine ? "Você" : name}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(c.created_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground/90">
                      {c.body}
                    </p>
                  </div>
                  {mine ? (
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() =>
                        startDelete(async () => {
                          await deleteComment(c.id, activityId);
                        })
                      }
                      aria-label="Apagar comentário"
                      className="self-start rounded-full p-2 text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <form
          ref={formRef}
          action={action}
          className="mt-4 flex items-end gap-2"
        >
          <input type="hidden" name="activityId" value={activityId} />
          <label className="sr-only" htmlFor="comment-body">
            Comentário
          </label>
          <textarea
            id="comment-body"
            name="body"
            required
            maxLength={300}
            rows={1}
            placeholder="Escreva um comentário..."
            className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending}
            aria-label="Enviar comentário"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink active:scale-95 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </button>
        </form>
        {state && !state.ok ? (
          <div className="mt-2">
            <Notice kind="error">{state.error}</Notice>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
