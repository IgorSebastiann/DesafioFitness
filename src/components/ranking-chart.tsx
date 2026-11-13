"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
