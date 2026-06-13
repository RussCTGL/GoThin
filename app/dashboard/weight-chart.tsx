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
      <p className="text-sm text-muted">
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
          <defs>
            <linearGradient id="weightStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#242836" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#98a1b5" fontSize={12} tickMargin={8} />
          <YAxis stroke="#98a1b5" fontSize={12} domain={["auto", "auto"]} />
          <Tooltip
            cursor={{ stroke: "#333950" }}
            contentStyle={{
              background: "#12141c",
              border: "1px solid #242836",
              borderRadius: 10,
              color: "#f2f4f8",
            }}
          />
          {goal != null && (
            <ReferenceLine
              y={goal}
              stroke="#34d399"
              strokeDasharray="4 4"
              label={{
                value: `goal ${goal}`,
                fill: "#34d399",
                fontSize: 11,
                position: "insideTopLeft",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="url(#weightStroke)"
            strokeWidth={3}
            dot={{ r: 3, fill: "#a3e635", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#34d399", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
