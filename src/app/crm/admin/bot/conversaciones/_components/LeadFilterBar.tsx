import Link from "next/link";

interface Props {
  activeLead?: string;
  leadKpis: Record<string, number>;
}

const LEAD_OPTIONS = [
  { key: "hot", emoji: "🔥", label: "Hot", color: "bg-red-100 text-red-800 border-red-300" },
  { key: "vip", emoji: "💎", label: "VIP", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "premium", emoji: "💰", label: "Premium", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "precio", emoji: "💸", label: "Precio", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "casual", emoji: "🤷", label: "Casual", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { key: "curioso", emoji: "👀", label: "Curioso", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "frio", emoji: "❄️", label: "Frío", color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
];

export default function LeadFilterBar({ activeLead, leadKpis }: Props) {
  return (
    <div className="space-y-2 bg-white border border-slate-200 rounded-md p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
        Lead Score (Fase B)
      </p>
      <div className="flex flex-wrap gap-1">
        <Link
          href="/crm/admin/bot/conversaciones"
          className={`px-2 py-1 text-xs rounded border transition ${
            !activeLead
              ? "bg-slate-700 text-white border-slate-700"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          Todos
        </Link>
        {LEAD_OPTIONS.map((opt) => {
          const count = leadKpis[opt.key] ?? 0;
          const isActive = activeLead === opt.key;
          return (
            <Link
              key={opt.key}
              href={`/crm/admin/bot/conversaciones?lead=${opt.key}`}
              className={`px-2 py-1 text-xs rounded border transition ${
                isActive ? "ring-2 ring-amber-400" : ""
              } ${opt.color}`}
            >
              {opt.emoji} {opt.label}
              {count > 0 && (
                <span className="ml-1 font-bold">({count})</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}