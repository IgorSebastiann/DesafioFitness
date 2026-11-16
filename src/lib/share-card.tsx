import { FlameMark } from "@/lib/brand-mark";
import type { ShareCardData, ShareCardPerson, ShareOptions } from "@/lib/share-card-data";
import { formatDurationMinutes } from "@/lib/time";

const BG = "#0b0c0e";
const SURFACE = "#14161a";
const SURFACE_3 = "#252930";
const BORDER = "#2a2e35";
const ACCENT = "#c6ff3d";
const MUTED = "#8d949f";
const TEXT = "#f4f5f7";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Texto do título e do selo de destaque, para qualquer número de pessoas. */
function headlines(data: ShareCardData) {
  const [first, second] = data.people;
  if (!second) {
    return {
      headline: `${first.points} ${first.points === 1 ? "ponto" : "pontos"}`,
      highlight: "Convide alguém para o desafio",
      color: MUTED,
    };
  }
  if (first.points === 0) return { headline: "Ninguém pontuou ainda", highlight: null, color: MUTED };
  if (first.points === second.points) {
    const tied = data.people.filter((p) => p.points === first.points).length;
    return {
      headline: "Empate no topo",
      highlight: tied === data.people.length ? `Tudo igual: ${first.points} pontos` : `${tied} pessoas com ${first.points} pontos`,
      color: MUTED,
    };
  }
  const gap = first.points - second.points;
  return {
    headline: `${first.name} ${data.final ? "venceu!" : "lidera"}`,
    highlight: `${gap} ${gap === 1 ? "ponto" : "pontos"} de vantagem`,
    color: first.color,
  };
}

function Avatar({ person, size }: { person: ShareCardPerson; size: number }) {
  return person.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={person.avatar}
      width={size}
      height={size}
      alt=""
      style={{ width: size, height: size, borderRadius: size, border: `4px solid ${person.color}`, objectFit: "cover" }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `4px solid ${person.color}`,
        background: SURFACE_3,
        color: person.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 800,
      }}
    >
      {initials(person.name) || "?"}
    </div>
  );
}

function subline(p: ShareCardPerson, options: ShareOptions) {
  const parts = [`${p.count} ${p.count === 1 ? "atividade" : "atividades"}`];
  if (options.time) parts.push(p.minutes ? formatDurationMinutes(p.minutes) : "0 min");
  return parts.join(" · ");
}

/** Card de compartilhamento (1080x1350): placar do período com fotos, modalidades e tempo, conforme as opções. */
export function ShareCard({ data, options }: { data: ShareCardData; options: ShareOptions }) {
  const compact = data.people.length > 2;
  const { headline, highlight, color } = headlines(data);
  const leaderId = data.people.length > 1 && data.people[0].points > data.people[1].points ? data.people[0].id : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        color: TEXT,
        padding: "72px 80px",
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FlameMark size={40} color={BG} filled />
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 6 }}>DESAFIO FITNESS</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
        <div style={{ display: "flex", fontSize: 32, color: MUTED }}>{data.periodLabel}</div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 800, marginTop: 10, lineHeight: 1.1 }}>{headline}</div>
        <div style={{ display: "flex", fontSize: 30, color: MUTED, marginTop: 10 }}>{data.challengeName}</div>
        {highlight ? (
          <div style={{ display: "flex", marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: 800,
                color,
                border: `3px solid ${color}`,
                borderRadius: 999,
                padding: "10px 28px",
              }}
            >
              {highlight}
            </div>
          </div>
        ) : null}
      </div>

      {/* A sobra de espaço fica mais acima do placar do que abaixo, sem um vão enorme no meio. */}
      <div style={{ display: "flex", flex: 3, minHeight: 32 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 16 : 24 }}>
        {data.people.map((p) =>
          compact ? (
            <CompactRow
              key={p.id}
              person={p}
              position={1 + data.people.filter((o) => o.points > p.points).length}
              options={options}
              leader={p.id === leaderId}
            />
          ) : (
            <LargeRow key={p.id} person={p} options={options} leader={p.id === leaderId} />
          ),
        )}
      </div>
      <div style={{ display: "flex", flex: 2 }} />
    </div>
  );
}

/** Até 2 pessoas: linha grande com chips de modalidade e faixa de fotos. */
function LargeRow({ person: p, options, leader }: { person: ShareCardPerson; options: ShareOptions; leader: boolean }) {
  const chips = options.modalities ? p.modalities.slice(0, 4) : [];
  const photos = options.photos ? p.photos.slice(0, 3) : [];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: SURFACE,
        borderRadius: 36,
        padding: "28px 36px",
        border: `4px solid ${leader ? p.color : BORDER}`,
        gap: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Avatar person={p} size={96} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: p.color }}>{p.name}</div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 4 }}>{subline(p, options)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 800, color: p.color, lineHeight: 1 }}>{p.points}</div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED, marginTop: 4 }}>{p.points === 1 ? "ponto" : "pontos"}</div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {chips.map((m) => (
            <div
              key={m.name}
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 400,
                color: TEXT,
                background: SURFACE_3,
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {m.name}
              <span style={{ color: p.color, fontWeight: 800, marginLeft: 10 }}>{m.count}x</span>
            </div>
          ))}
          {p.modalities.length > chips.length ? (
            <div style={{ display: "flex", fontSize: 26, color: MUTED, padding: "8px 8px" }}>+{p.modalities.length - chips.length}</div>
          ) : null}
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div style={{ display: "flex", gap: 12 }}>
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" width={272} height={130} style={{ width: 272, height: 130, borderRadius: 20, objectFit: "cover" }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** 3 ou 4 pessoas: linha compacta com posição, fotos pequenas e pontos. */
function CompactRow({
  person: p,
  position,
  options,
  leader,
}: {
  person: ShareCardPerson;
  position: number;
  options: ShareOptions;
  leader: boolean;
}) {
  const photos = options.photos ? p.photos.slice(0, 3) : [];
  const chips = options.modalities ? p.modalities.slice(0, 2).map((m) => `${m.name} ${m.count}x`).join(" · ") : "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: SURFACE,
        borderRadius: 32,
        padding: "20px 28px",
        border: `4px solid ${leader ? p.color : BORDER}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", width: 48, color: MUTED, fontWeight: 800 }}>
        <span style={{ fontSize: 36 }}>{position}</span>
        <span style={{ fontSize: 20, marginTop: 2 }}>o</span>
      </div>
      <Avatar person={p} size={76} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: p.color }}>{p.name}</div>
        <div style={{ display: "flex", fontSize: 24, color: MUTED, marginTop: 2 }}>{subline(p, options)}</div>
        {chips ? <div style={{ display: "flex", fontSize: 22, color: TEXT, marginTop: 4 }}>{chips}</div> : null}
      </div>
      {photos.length > 0 ? (
        <div style={{ display: "flex", gap: 8 }}>
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" width={72} height={72} style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover" }} />
          ))}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 120 }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: p.color, lineHeight: 1 }}>{p.points}</div>
        <div style={{ display: "flex", fontSize: 20, color: MUTED }}>{p.points === 1 ? "ponto" : "pontos"}</div>
      </div>
    </div>
  );
}
