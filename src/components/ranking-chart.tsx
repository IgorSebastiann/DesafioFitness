"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartPoint = { label: string; [participant: string]: string | number };

/** Pontos por período para cada participante (eixo X = período). */
export function RankingChart({
  data,
  series,
}: {
  data: ChartPoint[];
  series: { key: string; name: string; color: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full" role="img" aria-label="Pontuação por período">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#2a2e35" vertical={false} />
          <XAxis dataKey="label" stroke="#8d949f" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#8d949f" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#1c1f24" }}
            contentStyle={{ background: "#14161a", border: "1px solid #2a2e35", borderRadius: 12, color: "#f4f5f7" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8d949f" }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Pontos acumulados semana a semana (evolução do desafio inteiro). */
export function CumulativeChart({
  data,
  series,
}: {
  data: ChartPoint[];
  series: { key: string; name: string; color: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full" role="img" aria-label="Pontos acumulados por semana">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#2a2e35" vertical={false} />
          <XAxis dataKey="label" stroke="#8d949f" fontSize={11} tickLine={false} axisLine={false} minTickGap={12} padding={{ left: 16, right: 16 }} />
          <YAxis stroke="#8d949f" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "#14161a", border: "1px solid #2a2e35", borderRadius: 12, color: "#f4f5f7" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#8d949f" }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={data.length <= 12} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
