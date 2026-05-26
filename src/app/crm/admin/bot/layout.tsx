/**
 * Layout del dashboard del Bot v2 — Fase 12.
 *
 * Agrega:
 *  - Órdenes del bot
 *  - Telas solicitadas
 *  - Programaciones
 *  - Contactos
 *  - Indicador de kill switch en header
 */
import Link from "next/link";
import { getKillSwitchStatus } from "@/lib/bot/config/feature-flags";
import KillSwitchBanner from "./_components/KillSwitchBanner";

const NAV_ITEMS = [
  { href: "/crm/admin/bot", label: "Dashboard", icon: "📊" },
  { href: "/crm/admin/bot/conversaciones", label: "Conversaciones", icon: "💬" },
  { href: "/crm/admin/bot/ordenes", label: "Órdenes del Bot", icon: "📦", highlight: true },
  { href: "/crm/admin/bot/escalaciones", label: "Escalaciones", icon: "🚨", highlight: true },
  { href: "/crm/admin/bot/seguimientos", label: "Seguimientos", icon: "📬" },
  { href: "/crm/admin/bot/contactos", label: "Contactos", icon: "📞" },
  { href: "/crm/admin/bot/sales-agent", label: "Sales Agent", icon: "🎯", highlight: true },
  { href: "/crm/admin/bot/sourcing-queue", label: "Sourcing >1tn", icon: "🔧", highlight: true },
  { href: "/crm/admin/bot/aftercare", label: "Aftercare", icon: "💝", highlight: true },
  { href: "/crm/admin/bot/voz-de-marca", label: "Voz de Marca", icon: "🎭", highlight: true },
  { href: "/crm/admin/bot/referidos", label: "Referidos", icon: "🎁", highlight: true },
  { href: "/crm/admin/bot/transportistas", label: "Transportistas", icon: "🚛", highlight: true },
  { href: "/crm/admin/bot/pendientes", label: "Pagos pendientes", icon: "⏳" },
  { href: "/crm/admin/bot/telas-solicitadas", label: "Telas solicitadas", icon: "🧵" },
  { href: "/crm/admin/bot/programaciones", label: "Programaciones", icon: "📅" },
  { href: "/crm/admin/bot/catalogo", label: "Catálogo", icon: "🗂️" },
  { href: "/crm/admin/bot/objeciones", label: "Objeciones", icon: "🛑" },
  { href: "/crm/admin/bot/metricas", label: "Métricas", icon: "📈" },
  { href: "/crm/admin/bot/config", label: "Configuración", icon: "⚙️" },
  { href: "/crm/admin/bot/health", label: "Estado técnico", icon: "🩺" },
];

export default async function BotAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const killSwitch = await getKillSwitchStatus().catch(() => ({
    killed: false,
    v2Active: true,
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-400">Bot v2</p>
          <p className="text-lg font-semibold text-slate-900">🐺 El Coyote</p>
          <div className="mt-2">
            {killSwitch.v2Active ? (
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-800">
                🟢 ACTIVO 100%
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 animate-pulse">
                🔴 APAGADO (kill switch)
              </span>
            )}
          </div>
        </div>
        <nav className="p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition ${
                item.highlight
                  ? "text-slate-900 font-semibold hover:bg-yellow-50"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto">
        {killSwitch.killed && <KillSwitchBanner />}
        {children}
      </main>
    </div>
  );
}
