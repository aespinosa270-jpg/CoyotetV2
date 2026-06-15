/**
 * Pagina: Escalaciones del Bot — wrapper oscuro. Los KPIs y la cola
 * viven en EscalationsTable (client). El page solo carga datos.
 */
import { listEscalations } from "@/lib/bot/repositories/escalation-repo";
import EscalationsTable from "./_components/EscalationsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EscalacionesPage() {
  const items = await listEscalations({ take: 500 });
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Bot v2 — Atencion</p>
        <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Escalaciones <span className="text-amber-500">🚨</span></h1>
        <p className="text-sm text-zinc-500 mt-1">Casos que el bot detecto como requeridos de atencion humana. Las mas urgentes, arriba.</p>
      </header>
      <EscalationsTable items={items as any} />
    </div>
  );
}
