/**
 * Pagina: Clientes (compradores reales). Carga el resumen agrupado y lo
 * pasa al componente cliente.
 */
import { getClientesData } from "@/lib/bot/repositories/clientes-repo";
import ClientesBoard from "./_components/ClientesBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientesPage() {
  const data = await getClientesData();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Bot v2 — Cartera</p>
        <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Clientes <span className="text-amber-500">🤝</span></h1>
        <p className="text-sm text-zinc-500 mt-1">Tu cartera de oro: los que ya te compraron. Datos, historial y un clic para contactarlos.</p>
      </header>
      <ClientesBoard data={data as any} />
    </div>
  );
}
