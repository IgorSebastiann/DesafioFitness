import Link from "next/link";
import { Card } from "@/components/ui";

/** Exibido quando a pessoa ainda não está em nenhum desafio. */
export function NoChallenge() {
  return (
    <Card className="mx-auto max-w-xl">
      <h1 className="text-xl font-bold">Você ainda não está em um desafio</h1>
      <p className="mt-2 text-sm text-muted">
        Crie o seu desafio e convide até 3 pessoas com um link, ou entre com um convite que você recebeu.
      </p>
      <div className="mt-5">
        <Link
          href="/desafio"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink"
        >
          Criar ou entrar num desafio
        </Link>
      </div>
    </Card>
  );
}
