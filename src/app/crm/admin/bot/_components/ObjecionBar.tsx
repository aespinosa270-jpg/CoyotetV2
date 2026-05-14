interface ObjecionBarProps {
  label: string;
  total: number;
  clientesAfectados: number;
  maxTotal: number;
  href?: string;
}

export function ObjecionBar({
  label,
  total,
  clientesAfectados,
  maxTotal,
  href,
}: ObjecionBarProps) {
  const widthPct = maxTotal > 0 ? Math.min(100, (total / maxTotal) * 100) : 0;

  const content = (
    <div className="border border-slate-200 rounded-md p-3 hover:bg-slate-50 transition">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <span className="text-xs text-slate-500">
          {clientesAfectados} {clientesAfectados === 1 ? "cliente" : "clientes"}
        </span>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1">Peso acumulado: {total.toFixed(1)}</p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }
  return content;
}
