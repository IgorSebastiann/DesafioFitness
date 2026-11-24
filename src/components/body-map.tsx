"use client";

import Link from "next/link";
import { useState } from "react";
import { drawFigure, viewsOf, VIEWBOX, type Figure, type View } from "@/lib/body-map/figures";
import { muscleName, type MuscleCode } from "@/lib/domain/exercises";
import { cn } from "@/lib/cn";

type SelectProps = {
  mode: "select";
  /** Link de cada músculo (montado no servidor, preservando os outros filtros). */
  hrefs: Partial<Record<MuscleCode, string>>;
  selected: MuscleCode | null;
  /** Quantos exercícios cada músculo tem (vira parte do nome lido pelo leitor de tela). */
  counts?: Partial<Record<MuscleCode, number>>;
};

type HighlightProps = {
  mode: "highlight";
  primary: MuscleCode;
  secondary: MuscleCode[];
};

type Props = (SelectProps | HighlightProps) & {
  initialFigure: Figure;
  initialView?: View;
  /** Nas telas largas, mostra frente e costas lado a lado. */
  showBothOnWide?: boolean;
  className?: string;
};

const FIGURE_LABEL: Record<Figure, string> = { male: "Masculino", female: "Feminino" };
const VIEW_LABEL: Record<View, string> = { front: "Frente", back: "Costas" };

/**
 * Mapa muscular em SVG próprio. No modo "select" cada músculo é um link focável (Tab + Enter);
 * no modo "highlight" mostra o músculo principal em cor forte e os secundários mais fracos.
 */
export function BodyMap(props: Props) {
  const startView: View =
    props.initialView ?? (props.mode === "highlight" && !viewsOf(props.primary).includes("front") ? "back" : "front");
  const [figure, setFigure] = useState<Figure>(props.initialFigure);
  const [view, setView] = useState<View>(startView);

  const views: View[] = props.showBothOnWide ? ["front", "back"] : [view];

  return (
    <div className={cn("flex flex-col items-center gap-3", props.className)}>
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <Segmented
          label="Vista do corpo"
          value={view}
          options={(["front", "back"] as const).map((v) => ({ value: v, label: VIEW_LABEL[v] }))}
          onChange={setView}
          className={props.showBothOnWide ? "lg:hidden" : undefined}
        />
        <Segmented
          label="Desenho do corpo"
          value={figure}
          options={(["male", "female"] as const).map((f) => ({ value: f, label: FIGURE_LABEL[f] }))}
          onChange={setFigure}
        />
      </div>

      <div className="flex w-full justify-center gap-4">
        {props.showBothOnWide ? (
          <>
            <FigureSvg {...props} figure={figure} view={view} className="lg:hidden" />
            {views.map((v) => (
              <figure key={v} className="hidden w-full max-w-[260px] flex-col items-center gap-1 lg:flex">
                <FigureSvg {...props} figure={figure} view={v} />
                <figcaption className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{VIEW_LABEL[v]}</figcaption>
              </figure>
            ))}
          </>
        ) : (
          <FigureSvg {...props} figure={figure} view={view} />
        )}
      </div>

      {props.mode === "highlight" ? (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            Principal: <span className="text-foreground">{muscleName(props.primary)}</span>
          </li>
          {props.secondary.length > 0 ? (
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent/40" aria-hidden />
              Secundários:{" "}
              <span className="text-foreground">{props.secondary.map(muscleName).join(", ")}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function FigureSvg(props: Props & { figure: Figure; view: View; className?: string }) {
  const drawing = drawFigure(props.figure, props.view);
  const title = `Corpo ${FIGURE_LABEL[props.figure].toLowerCase()}, vista de ${VIEW_LABEL[props.view].toLowerCase()}`;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      className={cn("h-auto w-full max-w-[260px] select-none", props.className)}
      role={props.mode === "select" ? "group" : "img"}
      aria-label={
        props.mode === "select"
          ? `${title}. Toque num músculo para ver os exercícios.`
          : `${title}. Principal: ${muscleName(props.primary)}.${
              props.secondary.length ? ` Secundários: ${props.secondary.map(muscleName).join(", ")}.` : ""
            }`
      }
    >
      {drawing.hair && props.view === "front" ? <path d={drawing.hair} className="fill-surface-3" /> : null}
      {drawing.silhouette.map((d, i) => (
        <path key={i} d={d} className="fill-surface-2" />
      ))}
      <ellipse {...drawing.head} className="fill-surface-2" />
      {drawing.hair && props.view === "back" ? <path d={drawing.hair} className="fill-surface-3" /> : null}

      {drawing.regions.map(({ code, paths }) => {
        if (props.mode === "select") {
          const href = props.hrefs[code];
          const active = props.selected === code;
          const count = props.counts?.[code];
          const label = `${muscleName(code)}${count !== undefined ? `, ${count} ${count === 1 ? "exercício" : "exercícios"}` : ""}`;
          const shapes = paths.map((d, i) => (
            <path
              key={i}
              d={d}
              className={cn(
                "stroke-surface stroke-[1.2] transition-colors [stroke-linejoin:round]",
                active ? "fill-accent" : "fill-surface-3 group-hover:fill-accent/45",
                "group-focus-visible:stroke-foreground group-focus-visible:stroke-2",
              )}
            />
          ));
          if (!href) return <g key={code}>{shapes}</g>;
          return (
            <Link
              key={code}
              href={href}
              aria-label={label}
              aria-current={active ? "true" : undefined}
              className="group cursor-pointer outline-none"
            >
              <title>{muscleName(code)}</title>
              {shapes}
            </Link>
          );
        }

        const tone =
          code === props.primary ? "fill-accent" : props.secondary.includes(code) ? "fill-accent/40" : "fill-surface-3";
        return (
          <g key={code} aria-hidden>
            {paths.map((d, i) => (
              <path key={i} d={d} className={cn("stroke-surface stroke-[1.2] [stroke-linejoin:round]", tone)} />
            ))}
          </g>
        );
      })}

      {drawing.details.map((d, i) => (
        <path key={i} d={d} className="fill-none stroke-surface stroke-1" aria-hidden />
      ))}
    </svg>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 rounded-lg px-3 text-xs font-semibold transition",
            value === o.value ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
