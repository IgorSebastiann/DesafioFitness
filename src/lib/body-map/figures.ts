/**
 * Desenho próprio do corpo humano (masculino e feminino, frente e costas) para o mapa muscular.
 *
 * Cada forma é descrita só pela metade esquerda, como pontos (dx = distância do centro, y),
 * e espelhada para o outro lado. As curvas saem de uma spline Catmull-Rom fechada.
 * O corpo feminino reaproveita os mesmos pontos com um "perfil de largura" por altura
 * (ombros mais estreitos, cintura fina, quadril largo), então os músculos sempre se encaixam.
 */
import type { MuscleCode } from "@/lib/domain/exercises";

export type Figure = "male" | "female";
export type View = "front" | "back";

type Pt = readonly [dx: number, y: number];
type Part = "torso" | "arm";

const CX = 100;
export const VIEWBOX = { width: 200, height: 444 } as const;

// ---------------------------------------------------------------------------
// Perfil de largura
// ---------------------------------------------------------------------------
/** Multiplicador da largura do tronco/pernas por altura (keyframes interpolados). */
const WIDTH_PROFILE: Record<Figure, ReadonlyArray<readonly [y: number, k: number]>> = {
  male: [[0, 1]],
  female: [
    [50, 0.86],
    [100, 0.88],
    [150, 0.85],
    [180, 0.88],
    [205, 1.06],
    [240, 1.08],
    [300, 1.02],
    [360, 0.94],
    [444, 0.92],
  ],
};

function widthAt(figure: Figure, y: number): number {
  const frames = WIDTH_PROFILE[figure];
  if (y <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [y1, k1] = frames[i];
    if (y <= y1) {
      const [y0, k0] = frames[i - 1];
      return k0 + ((k1 - k0) * (y - y0)) / (y1 - y0);
    }
  }
  return frames[frames.length - 1][1];
}

/** Braços acompanham os ombros e abrem um pouco para baixo, sem encostar no quadril. */
function armDx(figure: Figure, dx: number, y: number): number {
  const spread = Math.max(0, y - 90);
  return figure === "male" ? dx + spread * 0.035 : dx * 0.88 + 1 + spread * 0.075;
}

function place(figure: Figure, part: Part, [dx, y]: Pt): [number, number] {
  const k = part === "arm" ? armDx(figure, dx, y) : dx * widthAt(figure, y);
  return [CX - k, y];
}

// ---------------------------------------------------------------------------
// Curvas
// ---------------------------------------------------------------------------
const r = (n: number) => Math.round(n * 10) / 10;

/** Spline Catmull-Rom fechada → caminho SVG com curvas cúbicas. */
function smoothClosed(points: ReadonlyArray<readonly [number, number]>, tension = 0.5): string {
  const n = points.length;
  const p = (i: number) => points[(i + n) % n];
  let d = `M${r(p(0)[0])},${r(p(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const t = tension / 3;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
  }
  return `${d} Z`;
}

function openLine(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${r(x)},${r(y)}`).join(" ");
}

const mirror = ([x, y]: readonly [number, number]): [number, number] => [2 * CX - x, y];

/** Forma da metade esquerda + o espelho dela. */
function pair(figure: Figure, part: Part, pts: readonly Pt[]): string[] {
  const left = pts.map((p) => place(figure, part, p));
  return [smoothClosed(left), smoothClosed(left.map(mirror).reverse())];
}

// ---------------------------------------------------------------------------
// Silhueta
// ---------------------------------------------------------------------------
/** Tronco + perna (metade esquerda), do centro do pescoço até o centro da virilha. */
const TORSO_HALF: Pt[] = [
  [0, 52], [8, 54], [9, 64], [20, 71], [34, 76], [42, 82], [40, 96], [34, 110],
  [31, 135], [29, 160], [29.5, 184], [33, 202], [35, 222], [35, 258], [32, 296],
  [28, 326], [29, 346], [30.5, 368], [27, 398], [21, 418], [24, 430], [20, 437],
  [10, 437], [9, 426], [11, 414], [12.5, 384], [12, 348], [10, 328], [8.5, 298],
  [5.5, 262], [2.5, 236], [0, 230],
];

const ARM_HALF: Pt[] = [
  [42, 80], [50, 86], [54.5, 100], [55.5, 124], [55.5, 148], [56.5, 172], [56, 196],
  [54, 212], [55, 224], [55.5, 238], [50, 251], [44, 248], [42.5, 236], [42, 220],
  [41, 200], [39.5, 178], [38.5, 156], [37.5, 134], [36, 112], [36, 96],
];

function torsoOutline(figure: Figure): string {
  const half = TORSO_HALF.map((p) => place(figure, "torso", p));
  const other = half.map(mirror).reverse();
  // Uma única forma fechada: metade esquerda de cima para baixo, metade direita de baixo para cima.
  return smoothClosed([...half, ...other.slice(1, -1)], 0.42);
}

// ---------------------------------------------------------------------------
// Músculos
// ---------------------------------------------------------------------------
type Shape = { part: Part; pts: Pt[] };
type RegionDef = Partial<Record<MuscleCode, Shape[]>>;

const torso = (...pts: Pt[]): Shape => ({ part: "torso", pts });
const arm = (...pts: Pt[]): Shape => ({ part: "arm", pts });

const FOREARM = arm([40.5, 158], [50.5, 156], [55, 170], [55, 192], [52.5, 208], [45.5, 211], [42, 196], [40, 176]);

const FRONT: RegionDef = {
  traps: [torso([8.5, 61], [12, 64], [21, 70.5], [33, 76], [26, 77], [15, 72.5], [9.5, 68])],
  front_delts: [arm([35, 81], [43, 81.5], [48.5, 90], [49.5, 104], [44.5, 110], [39, 102], [35.5, 90])],
  side_delts: [arm([45.5, 81.5], [51, 87], [54.5, 100], [54, 115], [50.5, 109], [50.5, 94])],
  chest: [torso([2, 79], [14, 77], [28, 79.5], [35.5, 85], [36, 99], [31, 111], [20, 116.5], [9, 117], [2, 114])],
  biceps: [arm([39, 112], [47, 113], [52, 125], [52.5, 141], [48.5, 152], [42.5, 150], [38.5, 137], [38, 122])],
  forearms: [FOREARM],
  abs: [torso([2, 121], [12.5, 120.5], [14.5, 140], [14, 168], [12, 190], [7, 205], [2, 209])],
  obliques: [torso([17, 122], [28, 116], [30.5, 138], [29, 162], [30, 186], [24, 198], [18, 186], [17.5, 152])],
  abductors: [torso([27.5, 200], [33.5, 205], [35.5, 222], [34, 238], [29.5, 226])],
  quadriceps: [torso([15, 226], [26, 214], [33, 230], [33.5, 258], [30, 290], [24.5, 316], [16, 320], [12, 302], [11.5, 272], [12.5, 246])],
  adductors: [torso([4, 234], [10.5, 228], [12, 248], [10.5, 274], [7.5, 290], [5, 266])],
  calves: [
    torso([20.5, 344], [29.5, 350], [31, 370], [27, 394], [21, 401], [17.5, 378], [18, 356]),
    torso([11, 348], [15.5, 350], [16, 378], [13.5, 394], [11, 374]),
  ],
};

const BACK: RegionDef = {
  traps: [torso([0, 56], [8.5, 57], [12, 64], [22, 71], [36, 78.5], [24, 85], [13, 98], [5, 122], [0, 134])],
  rear_delts: [arm([35, 81], [43.5, 81.5], [49, 91], [49, 105], [42, 104], [36.5, 94])],
  side_delts: [arm([45.5, 81.5], [51, 87], [54.5, 100], [54, 115], [50.5, 109], [50.5, 94])],
  triceps: [arm([38.5, 108], [48, 109], [53, 124], [53, 143], [48, 153], [41.5, 148], [38, 128])],
  forearms: [FOREARM],
  middle_back: [torso([6.5, 108], [15.5, 96], [27.5, 90], [31, 102], [24, 113], [11, 121], [6.5, 126])],
  lats: [torso([24, 120], [33, 108], [33.5, 128], [31, 152], [26, 172], [17.5, 182], [14.5, 164], [15, 140])],
  lower_back: [torso([2, 152], [9.5, 148], [14, 166], [16, 184], [10.5, 196], [2, 198])],
  abductors: [torso([22.5, 190], [30.5, 194], [34, 206], [30, 207], [21.5, 200])],
  glutes: [torso([2, 203], [15, 199], [29.5, 209], [34.5, 225], [31, 243], [17, 248], [5, 242], [2, 225])],
  hamstrings: [torso([9.5, 254], [19, 252], [32, 254], [32, 282], [27.5, 312], [19, 321], [12.5, 312], [9.5, 284])],
  adductors: [torso([2.5, 240], [8, 249], [8, 272], [5.5, 284], [3, 262])],
  calves: [
    torso([20.5, 337], [28.5, 342], [30.5, 362], [27, 388], [21, 398], [19, 378], [19, 352]),
    torso([11.5, 341], [18, 338], [18, 360], [16, 394], [12, 384], [10.5, 360]),
  ],
};

/** Linhas de detalhe (não clicáveis): divisões do abdômen, do peitoral e da coluna. */
function detailLines(figure: Figure, view: View): string[] {
  const t = (p: Pt) => place(figure, "torso", p);
  if (view === "front") {
    return [
      openLine([t([0, 121]), t([0, 207])]),
      ...[140, 158, 176].map((y) => openLine([t([13.5, y]), t([0, y + 1.5]), mirror(t([13.5, y]))])),
    ];
  }
  return [openLine([t([0, 136]), t([0, 199])])];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export type FigureDrawing = {
  head: { cx: number; cy: number; rx: number; ry: number };
  /** Cabelo (feminino): desenhado atrás da cabeça na frente e por cima nas costas. */
  hair: string | null;
  silhouette: string[];
  regions: Array<{ code: MuscleCode; paths: string[] }>;
  details: string[];
};

const cache = new Map<string, FigureDrawing>();

export function drawFigure(figure: Figure, view: View): FigureDrawing {
  const key = `${figure}:${view}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const defs = view === "front" ? FRONT : BACK;
  const regions = (Object.entries(defs) as Array<[MuscleCode, Shape[]]>).map(([code, shapes]) => ({
    code,
    paths: shapes.flatMap((s) => pair(figure, s.part, s.pts)),
  }));

  const head = figure === "male" ? { cx: CX, cy: 30, rx: 15.5, ry: 19 } : { cx: CX, cy: 30, rx: 14.5, ry: 18 };
  const hair =
    figure === "female"
      ? view === "front"
        ? "M100,9 C84,9 80,22 81,36 C82,52 80,64 86,70 L92,66 C88,56 87,44 89,34 C92,26 108,26 111,34 C113,44 112,56 108,66 L114,70 C120,64 118,52 119,36 C120,22 116,9 100,9 Z"
        : "M100,9 C83,9 80,22 81,38 C82,54 82,64 88,70 L112,70 C118,64 118,54 119,38 C120,22 117,9 100,9 Z"
      : null;

  const drawing: FigureDrawing = {
    head,
    hair,
    silhouette: [torsoOutline(figure), ...pair(figure, "arm", ARM_HALF)],
    regions,
    details: detailLines(figure, view),
  };
  cache.set(key, drawing);
  return drawing;
}

/** Em qual vista cada músculo aparece (para abrir o lado certo ao destacar um exercício). */
export function viewsOf(code: MuscleCode): View[] {
  const views: View[] = [];
  if (FRONT[code]) views.push("front");
  if (BACK[code]) views.push("back");
  return views;
}
