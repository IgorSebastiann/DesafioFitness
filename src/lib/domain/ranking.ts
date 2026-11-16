export type RankInput = { userId: string; points: number };

export type RankedEntry = {
  userId: string;
  points: number;
  /** 1 = líder. Participantes empatados compartilham a mesma posição. */
  position: number;
  tiedWithOther: boolean;
};

/** Ordena por pontos e calcula posição competitiva (1, 1, 3...). */
export function rank(rows: RankInput[]): RankedEntry[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points);
  return sorted.map((row) => {
    const greater = rows.filter((r) => r.points > row.points).length;
    const equal = rows.filter((r) => r.points === row.points && r.userId !== row.userId).length;
    return {
      userId: row.userId,
      points: row.points,
      position: greater + 1,
      tiedWithOther: equal > 0 && row.points > 0,
    };
  });
}

/**
 * Quem lidera e por quanto (diferença para o 2º colocado). Sem líder (null) em empate
 * no topo ou sem pontos. Funciona para qualquer número de participantes.
 */
export function gap(rows: RankInput[]): { diff: number; leaderId: string | null } {
  if (rows.length < 2) return { diff: 0, leaderId: null };
  const sorted = [...rows].sort((a, b) => b.points - a.points);
  const diff = sorted[0].points - sorted[1].points;
  if (diff === 0) return { diff: 0, leaderId: null };
  return { diff, leaderId: sorted[0].userId };
}
