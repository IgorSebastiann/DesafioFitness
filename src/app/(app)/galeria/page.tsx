import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { getGallery, proofUrlFor } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { formatDayMonth } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Galeria" };

/** Todas as fotos e vídeos do desafio em grade, como um álbum do casal. */
export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ quem?: string }> }) {
  const viewer = await getViewer();
  const { challenge, user, partner } = viewer;
  if (!challenge) return <NoChallenge />;

  const { quem } = await searchParams;
  const filter = quem === "eu" || quem === "parceiro" ? quem : "todos";
  const all = await getGallery(user.id, challenge.id);
  const items = all.filter((i) =>
    filter === "eu" ? i.user_id === user.id : filter === "parceiro" ? i.user_id !== user.id : true,
  );

  const tabs = [
    { key: "todos", label: "Todos" },
    { key: "eu", label: "Você" },
    ...(partner ? [{ key: "parceiro", label: displayName(partner) }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Galeria" subtitle={`${all.length} ${all.length === 1 ? "registro" : "registros"} do desafio`} />

      <nav aria-label="Filtrar por pessoa" className="inline-flex w-fit max-w-full rounded-full bg-surface-2 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "todos" ? "/galeria" : `/galeria?quem=${t.key}`}
            aria-current={filter === t.key ? "true" : undefined}
            className={cn(
              "truncate rounded-full px-4 py-1.5 text-xs font-semibold transition",
              filter === t.key ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState title="Nenhuma foto ainda" description="As comprovações das atividades aparecem aqui." />
      ) : (
        <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => {
            const url = proofUrlFor(item.proof_path) ?? "";
            const label = `${item.category_name} em ${formatDayMonth(item.activity_date)}`;
            return (
              <li key={item.id}>
                <Link
                  href={`/atividades/${item.id}`}
                  aria-label={label}
                  className="group relative block aspect-square overflow-hidden rounded-lg bg-surface-2"
                >
                  {item.proof_kind === "video" ? (
                    <>
                      <video
                        src={`${url}#t=0.1`}
                        preload="metadata"
                        muted
                        playsInline
                        className="pointer-events-none h-full w-full object-cover"
                      />
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1">
                        <Play className="h-3 w-3 fill-white text-white" aria-hidden />
                      </span>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                  <span
                    className={cn(
                      "absolute bottom-1.5 left-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-black/40",
                      item.user_id === user.id ? "bg-accent" : "bg-partner",
                    )}
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
