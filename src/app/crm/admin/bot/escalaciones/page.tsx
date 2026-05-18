/**
 * Página: Escalaciones del Bot.
 *
 * Lista todas las escalaciones (pendientes, atendidas, descartadas) con
 * filtros y acciones para marcar/descartar.
 */
import {
  listEscalations,
  getEscalationStats,
} from "@/lib/bot/repositories/escalation-repo";
import EscalationsTable from "./_components/EscalationsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EscalacionesPage() {
  const [items, stats] = await Promise.all([
    listEscalations({ take: 500 }),
    getEscalationStats(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Atención
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          ESCALACIONES <span className="text-[#FDCB02]">🚨</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Casos que el bot detectó automáticamente como requeridos de atención
          humana especializada.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border-2 border-red-300 rounded-md p-4">
          <p className="text-xs uppercase text-red-700 font-bold">Pendientes</p>
          <p className="text-3xl font-black text-red-900">{stats.pendientes}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4">
          <p className="text-xs uppercase text-slate-500">Atendidas</p>
          <p className="text-2xl font-black">{stats.atendidas}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <p className="text-xs uppercase text-slate-500">Descartadas</p>
          <p className="text-2xl font-black">{stats.descartadas}</p>
        </div>
      </div>

      {/* Tabla */}
      <EscalationsTable items={items as any} />
    </div>
  );
}
