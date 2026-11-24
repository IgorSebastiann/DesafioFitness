import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { listCredits, type CreditRow } from "@/lib/data/exercises";
import { creditParts, licenseUrl, ORIGINS, type MediaOrigin } from "@/lib/domain/exercises";

export const metadata: Metadata = { title: "Créditos" };

const SOURCES: Record<Exclude<MediaOrigin, "own">, { site: string; about: string }> = {
  wger: {
    site: "https://wger.de",
    about: "Projeto aberto de exercícios. Usamos só as mídias marcadas como CC0, CC BY ou CC BY-SA e não usamos as geradas por IA.",
  },
  everkinetic: {
    site: "https://github.com/everkinetic/data",
    about: "Ilustrações das posições inicial e final dos exercícios.",
  },
  wikimedia: {
    site: "https://commons.wikimedia.org",
    about: "Somente arquivos marcados como CC0, CC BY ou CC BY-SA.",
  },
};

/** Fontes e licenças de todas as mídias e textos de terceiros (obrigatório para CC BY e CC BY-SA). */
export default async function CreditsPage() {
  const viewer = await getViewer();
  const credits = await listCredits(viewer.userId);
  const byOrigin = new Map<MediaOrigin, CreditRow[]>();
  for (const c of credits) byOrigin.set(c.origin, [...(byOrigin.get(c.origin) ?? []), c]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/exercicios"
        className="-mb-4 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exercícios
      </Link>
      <PageHeader title="Créditos" subtitle="Fontes e licenças das imagens, vídeos e textos dos exercícios." />

      <Card>
        <SectionTitle>Textos dos exercícios</SectionTitle>
        <p className="text-sm leading-relaxed text-muted">
          A execução passo a passo parte do{" "}
          <a
            href="https://github.com/yuhonas/free-exercise-db"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            free-exercise-db
          </a>{" "}
          (domínio público, licença Unlicense), traduzido e adaptado para o português. Erros comuns, dicas e os
          exercícios sem essa origem foram escritos para o Desafio Fitness.
        </p>
      </Card>

      <Card>
        <SectionTitle>Desenho do corpo</SectionTitle>
        <p className="text-sm leading-relaxed text-muted">O mapa muscular é um desenho próprio do Desafio Fitness.</p>
      </Card>

      {credits.length === 0 ? (
        <EmptyState
          title="Nenhuma mídia de terceiros ainda"
          description="Quando houver fotos ou vídeos de fontes abertas, o autor e a licença de cada um aparecem aqui."
        />
      ) : (
        (Object.keys(SOURCES) as Array<keyof typeof SOURCES>)
          .filter((origin) => byOrigin.has(origin))
          .map((origin) => (
            <Card key={origin}>
              <SectionTitle>
                <a href={SOURCES[origin].site} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                  {ORIGINS[origin]}
                </a>
              </SectionTitle>
              <p className="mb-4 text-sm text-muted">{SOURCES[origin].about}</p>
              <ul className="flex flex-col divide-y divide-border">
                {byOrigin.get(origin)!.map((c, i) => {
                  const credit = creditParts(c);
                  const href = licenseUrl(c.license, c.license_version);
                  return (
                    <li key={i} className="flex flex-col gap-0.5 py-2.5 text-sm">
                      <Link href={`/exercicios/${c.exercise_slug}`} className="font-medium hover:text-accent">
                        {c.exercise_name}
                        <span className="text-muted"> · {c.kind === "image" ? "imagem" : c.kind === "gif" ? "GIF" : "vídeo"}</span>
                      </Link>
                      <span className="text-xs text-muted">
                        {credit.author} ·{" "}
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2">
                            {credit.license}
                          </a>
                        ) : (
                          credit.license
                        )}
                        {c.source_url ? (
                          <>
                            {" "}·{" "}
                            <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                              original
                            </a>
                          </>
                        ) : null}
                        {credit.edited ? <span className="block">{credit.edited}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))
      )}
    </div>
  );
}
