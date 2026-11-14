/** Chama do Desafio Fitness (mesmo desenho do ícone Flame do menu), para os ícones gerados em PNG. */
const FLAME = "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4";

export function FlameMark({ size, color, filled = false }: { size: number; color: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d={FLAME}
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 1.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ícone do app (igual ao logo do menu): fundo verde-limão e chama escura. `inset` deixa folga para ícones "maskable". */
export function AppIconArt({ size, rounded, inset = 0.62 }: { size: number; rounded: boolean; inset?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#c6ff3d",
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
      }}
    >
      <FlameMark size={Math.round(size * inset)} color="#0b0c0e" filled />
    </div>
  );
}
