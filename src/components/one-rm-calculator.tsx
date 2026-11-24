"use client";

import { useState } from "react";
import { Card, Field, inputClass } from "@/components/ui";
import { ONE_RM_AVERAGE_MAX_REPS, REP_RANGES, brzycki, epley, estimateOneRm, loadForReps, oneRmMethod, roundLoad } from "@/lib/domain/workouts";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function OneRmCalculator() {
  const [load, setLoad] = useState("");
  const [reps, setReps] = useState("");
  const kg = Number(load.replace(",", "."));
  const r = Math.round(Number(reps));
  const valid = kg > 0 && r >= 1 && r <= 30;
  const e = valid ? epley(kg, r) : 0;
  // Brzycki perde precisão com muitas repetições: aparece só até o mesmo limite usado na média.
  const b = valid && r <= ONE_RM_AVERAGE_MAX_REPS ? brzycki(kg, r) : 0;
  const base = valid ? estimateOneRm(kg, r) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted">Informe uma série que você fez até perto da falha: a carga e quantas repetições saíram.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carga (kg)">
            <input inputMode="decimal" value={load} onChange={(ev) => setLoad(ev.target.value)} placeholder="Ex.: 40" className={inputClass} />
          </Field>
          <Field label="Repetições" hint="De 1 a 30">
            <input inputMode="numeric" value={reps} onChange={(ev) => setReps(ev.target.value)} placeholder="Ex.: 10" className={inputClass} />
          </Field>
        </div>
      </Card>

      <section aria-live="polite" aria-labelledby="resultado" className="flex flex-col gap-3">
        <h2 id="resultado" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Resultado
        </h2>
        {valid ? (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-border bg-surface p-4">
                <dt className="text-xs text-muted">Epley</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums">{fmt(e)} kg</dd>
              </div>
              <div className="rounded-3xl border border-border bg-surface p-4">
                <dt className="text-xs text-muted">Brzycki</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums">{b ? `${fmt(b)} kg` : "—"}</dd>
                {!b ? <p className="mt-1 text-xs text-muted">Só vale até {ONE_RM_AVERAGE_MAX_REPS} repetições.</p> : null}
              </div>
            </dl>
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <table className="w-full text-sm">
                <caption className="px-4 pt-4 text-left text-sm text-muted">
                  Carga sugerida por faixa, a partir de um 1RM de {fmt(base)} kg ({oneRmMethod(r).replace(/^./, (c) => c.toLowerCase())}), arredondada para 1 kg
                </caption>
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th scope="col" className="px-4 py-2 font-medium">Repetições</th>
                    <th scope="col" className="px-4 py-2 font-medium">Objetivo</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {REP_RANGES.map((row) => (
                    <tr key={row.reps}>
                      <td className="px-4 py-2.5 font-mono tabular-nums">{row.reps}</td>
                      <td className="px-4 py-2.5 text-muted">{row.goal}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{fmt(roundLoad(loadForReps(base, row.reps)))} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              São estimativas. Para 1 a 3 repetições, teste com segurança, com aquecimento e alguém ajudando.
            </p>
          </>
        ) : (
          <p className="rounded-3xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted">
            Preencha a carga e as repetições para ver a estimativa.
          </p>
        )}
      </section>
    </div>
  );
}
