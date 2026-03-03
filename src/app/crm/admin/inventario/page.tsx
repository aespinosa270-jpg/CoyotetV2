import { getInventoryDashboard } from "@/app/actions/inventory";
import Link from "next/link";

export default async function InventarioDashboard() {
  const stock = await getInventoryDashboard();

  const byLocation = {
    GUATEMALA_97: stock.filter((s) => s.location === "GUATEMALA_97"),
    PLOMO_203:    stock.filter((s) => s.location === "PLOMO_203"),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-1">Sistema de Control</p>
          <h1 className="text-3xl font-bold tracking-tight">KARDEX <span className="text-amber-400">OPERACIONAL</span></h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/crm/admin/inventario/movimiento"
            className="px-5 py-2.5 bg-amber-400 text-black text-sm font-bold tracking-wider hover:bg-amber-300 transition-colors"
          >
            + REGISTRAR MOVIMIENTO
          </Link>
          <Link
            href="/crm/admin/inventario/historial"
            className="px-5 py-2.5 border border-zinc-700 text-zinc-300 text-sm tracking-wider hover:border-zinc-500 transition-colors"
          >
            HISTORIAL
          </Link>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: "PRODUCTOS EN STOCK", value: new Set(stock.map((s) => s.productId)).size },
          { label: "TOTAL KG/M SISTEMA", value: stock.reduce((a, s) => a + s.quantity, 0).toFixed(1) },
          { label: "ROLLOS TOTALES",      value: stock.reduce((a, s) => a + s.rollCount, 0) },
          { label: "SUCURSALES ACTIVAS",  value: 2 },
        ].map((stat) => (
          <div key={stat.label} className="border border-zinc-800 p-5 bg-zinc-900/50">
            <p className="text-xs text-zinc-500 tracking-widest mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-amber-400">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tablas por sucursal */}
      {(["GUATEMALA_97", "PLOMO_203"] as const).map((loc) => (
        <div key={loc} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-sm tracking-[0.25em] text-zinc-300 uppercase">
              {loc === "GUATEMALA_97" ? "Guatemala #97" : "Plomo #203"}
            </h2>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">{byLocation[loc].length} variantes</span>
          </div>

          <div className="border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  {["PRODUCTO", "SKU", "COLOR", "UNIDAD", "KILOS/METROS", "ROLLOS"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 tracking-widest font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byLocation[loc].length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-xs tracking-widest">
                      SIN INVENTARIO REGISTRADO
                    </td>
                  </tr>
                ) : (
                  byLocation[loc].map((row) => (
                    <tr key={row.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{row.product.title}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{row.product.sku}</td>
                      <td className="px-4 py-3">
                        {row.color ? (
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-zinc-700 inline-block"
                              style={{ backgroundColor: row.color.hex }}
                            />
                            <span className="text-zinc-300">{row.color.name}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs uppercase">{row.product.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${row.quantity < 10 ? "text-red-400" : "text-amber-400"}`}>
                          {row.quantity.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{row.rollCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}