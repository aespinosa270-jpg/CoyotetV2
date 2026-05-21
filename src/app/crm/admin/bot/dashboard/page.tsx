import DashboardClient from "./_components/DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Inteligencia
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          DASHBOARD <span className="text-[#FDCB02]">🎯</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Visión 360° del rendimiento del bot. Actualización automática cada 60 segundos.
        </p>
      </header>

      <DashboardClient />
    </div>
  );
}