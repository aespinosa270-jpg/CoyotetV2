interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  accent?: "blue" | "green" | "orange" | "red" | "slate";
}

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  blue: "border-blue-500 bg-blue-50",
  green: "border-emerald-500 bg-emerald-50",
  orange: "border-orange-500 bg-orange-50",
  red: "border-red-500 bg-red-50",
  slate: "border-slate-300 bg-white",
};

export function MetricCard({
  label,
  value,
  hint,
  trend,
  accent = "slate",
}: MetricCardProps) {
  const accentClass = ACCENT_CLASSES[accent];
  const trendIcon =
    trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "neutral" ? "→" : "";
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-600"
        : "text-slate-400";

  return (
    <div
      className={`border-l-4 ${accentClass} p-4 rounded-md shadow-sm`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">
        {value}{" "}
        {trendIcon && (
          <span className={`text-sm ${trendColor}`}>{trendIcon}</span>
        )}
      </p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
