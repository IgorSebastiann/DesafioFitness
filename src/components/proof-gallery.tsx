import { ArrowLeftRight } from "lucide-react";

type Proof = { url: string; kind: "image" | "video" };

/**
 * Comprovações da atividade. Uma só: ocupa a largura toda. Várias: carrossel com
 * rolagem lateral (arrasta no celular) e contador em cada item.
 */
export function ProofGallery({ proofs }: { proofs: Proof[] }) {
  if (proofs.length === 0) {
    return (
      <div className="mt-5 flex h-48 items-center justify-center rounded-2xl bg-surface-2 text-sm text-muted">
        Comprovação indisponível
      </div>
    );
  }
  if (proofs.length === 1) {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl bg-surface-2">
        <Media proof={proofs[0]} label="Comprovação da atividade" />
      </div>
    );
  }
  return (
    <div className="mt-5">
      <ul
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1"
        aria-label={`${proofs.length} comprovações; deslize para ver todas`}
      >
        {proofs.map((p, i) => (
          <li key={p.url} className="relative w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl bg-surface-2">
            <Media proof={p} label={`Comprovação ${i + 1} de ${proofs.length}`} />
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
              {i + 1}/{proofs.length}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden /> Deslize para ver as {proofs.length} comprovações
      </p>
    </div>
  );
}

function Media({ proof, label }: { proof: Proof; label: string }) {
  return proof.kind === "video" ? (
    <video src={proof.url} controls playsInline preload="metadata" aria-label={label} className="max-h-[70vh] w-full bg-black" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={proof.url} alt={label} className="max-h-[70vh] w-full object-contain" />
  );
}
