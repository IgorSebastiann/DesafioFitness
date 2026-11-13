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

/** Diferença absoluta de pontos e quem lidera (null em empate ou sem pontos). */
export function gap(rows: RankInput[]): { diff: number; leaderId: string | null } {
  if (rows.length < 2) return { diff: 0, leaderId: null };
  const [a, b] = rows;
  const diff = Math.abs(a.points - b.points);
  if (diff === 0) return { diff: 0, leaderId: null };
  return { diff, leaderId: a.points > b.points ? a.userId : b.userId };
}
