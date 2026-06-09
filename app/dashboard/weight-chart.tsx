"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WeightPoint = { iso: string; weight: number };

export default function WeightChart({
  data,
  goal,
}: {
  data: WeightPoint[];
  goal?: number;
}) {
  if (data.length < 2) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        Log at least two weigh-ins to see your trend.
      </p>
    );
  }

  // Format the date label in the viewer's timezone (this runs in the browser).
  const points = data.map((d) => ({
    weight: d.weight,
    date: new Date(d.iso).toLocaleDateString(undefined, {
      month: "numeric",
      day: "numeric",
    }),
  }));

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#262b36" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#9aa3b2" fontSize={12} tickMargin={8} />
          <YAxis stroke="#9aa3b2" fontSize={12} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#171a21",
              border: "1px solid #262b36",
              borderRadius: 8,
              color: "#e6e8ec",
            }}
          />
          {goal != null && (
            <ReferenceLine
              y={goal}
              stroke="#4ade80"
              strokeDasharray="4 4"
              label={{
                value: `goal ${goal}`,
                fill: "#4ade80",
                fontSize: 11,
                position: "insideTopLeft",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#4ade80"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
