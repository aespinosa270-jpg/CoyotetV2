/**
 * Gráfico de barras simple en SVG.
 *
 * No usa librerías externas (recharts/d3) — es liviano y sin deps.
 * Suficiente para los gráficos de 30 días.
 */

interface DailyCount {
  date: string;
  count: number;
}

interface Props {
  data: DailyCount[];
  color?: string;
  height?: number;
  label?: string;
}

export function BarChart30d({
  data,
  color = "#3b82f6",
  height = 120,
  label,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-8 text-center">
        Sin datos
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length;
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div>
      {label && (
        <p className="text-xs text-slate-500 mb-1">
          {label} · Total: <span className="font-semibold text-slate-700 tabular-nums">{total}</span>
        </p>
      )}
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => {
          const h = max === 0 ? 0 : (d.count / max) * (height - 14);
          const x = i * barWidth;
          const y = height - h - 14;
          return (
            <g key={d.date}>
              <title>
                {d.date}: {d.count}
              </title>
              <rect
                x={x + 0.2}
                y={y}
                width={barWidth - 0.4}
                height={h}
                fill={color}
                opacity={d.count === 0 ? 0.15 : 0.85}
              />
              {/* Etiqueta numérica encima de barras con valor */}
              {d.count > 0 && h > 10 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 1}
                  fontSize="3"
                  textAnchor="middle"
                  fill="#475569"
                  className="font-medium"
                >
                  {d.count}
                </text>
              )}
            </g>
          );
        })}
        {/* Eje X: primera, mitad, última fecha */}
        <text x="0" y={height - 1} fontSize="3" fill="#94a3b8">
          {data[0]?.date.slice(5)}
        </text>
        <text
          x="50"
          y={height - 1}
          fontSize="3"
          textAnchor="middle"
          fill="#94a3b8"
        >
          {data[Math.floor(data.length / 2)]?.date.slice(5)}
        </text>
        <text
          x="100"
          y={height - 1}
          fontSize="3"
          textAnchor="end"
          fill="#94a3b8"
        >
          {data[data.length - 1]?.date.slice(5)}
        </text>
      </svg>
    </div>
  );
}
