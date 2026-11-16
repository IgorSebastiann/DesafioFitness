import { FlameMark } from "@/lib/brand-mark";
import { formatDayMonth } from "@/lib/time";

const BG = "#0b0c0e";
const SURFACE = "#14161a";
const ACCENT = "#c6ff3d";
const PARTNER = "#ff7a3d";
const MUTED = "#8d949f";

export type WeekCardPerson = {
  id: string;
  name: string;
  points: number;
  count: number;
};

/** Layout do card do placar da semana (1080x1350), usado pelo ImageResponse. */
export function WeekCard({
  viewerId,
  challengeName,
  week,
  people,
}: {
  viewerId: string;
  challengeName: string;
  week: { start: string; end: string };
  people: WeekCardPerson[];
}) {
  const [first, second] = people;
  const leader =
    !second || first.points === second.points
      ? null
      : first.points > second.points
        ? first
        : second;
  const headline = !second
    ? `${first.points} ${first.points === 1 ? "ponto" : "pontos"} na semana`
    : leader
      ? `${leader.name} lidera a semana`
      : first.points === 0
        ? "Semana começando"
        : "Empate na semana";
  const gap = second ? Math.abs(first.points - second.points) : 0;
  const highlight = !second
    ? "Convide alguém para o desafio"
    : leader
      ? `${gap} ${gap === 1 ? "ponto" : "pontos"} de vantagem`
      : first.points === 0
        ? "Ninguém pontuou ainda"
        : `Tudo igual: ${first.points} a ${second.points}`;
  const highlightColor = leader ? (leader.id === viewerId ? ACCENT : PARTNER) : MUTED;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        color: "#f4f5f7",
        padding: 80,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FlameMark size={44} color={BG} filled />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 6,
          }}
        >
          DESAFIO FITNESS
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
        <div style={{ display: "flex", fontSize: 34, color: MUTED }}>
          Semana de {formatDayMonth(week.start)} a {formatDayMonth(week.end)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            marginTop: 16,
            lineHeight: 1.1,
          }}
        >
          {headline}
        </div>
        <div
          style={{ display: "flex", fontSize: 32, color: MUTED, marginTop: 16 }}
        >
          {challengeName}
        </div>
      </div>

      {/* Destaque centralizado no espaço entre o título e o placar. */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 800,
            color: highlightColor,
            border: `3px solid ${highlightColor}`,
            borderRadius: 999,
            padding: "14px 36px",
          }}
        >
          {highlight}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {people.map((p) => {
          const color = p.id === viewerId ? ACCENT : PARTNER;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                background: SURFACE,
                borderRadius: 40,
                padding: "40px 48px",
                border:
                  leader?.id === p.id
                    ? `4px solid ${color}`
                    : "4px solid #2a2e35",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", flex: 1 }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 48,
                    fontWeight: 800,
                    color,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    color: MUTED,
                    marginTop: 8,
                  }}
                >
                  {p.count}{" "}
                  {p.count === 1
                    ? "atividade aprovada"
                    : "atividades aprovadas"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 120,
                    fontWeight: 800,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {p.points}
                </div>
                <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 8 }}>
                  {p.points === 1 ? "ponto" : "pontos"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
