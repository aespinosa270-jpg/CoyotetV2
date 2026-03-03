import { getMovementHistory } from "@/app/actions/inventory";
import Link from "next/link";

export default async function HistorialPage() {
  const movements = await getMovementHistory(200);

  const badge = (type: string) => {
    if (type === "ENTRADA") return "bg-emerald-500/20 text-emerald-400 border-emerald-800";
    if (type === "SALIDA")  return "bg-red-500/20 text-red-400 border-red-800";
    return "bg-amber-500/20 text-amber-400 border-amber-800";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-1">Auditoría</p>
          <h1 className="text-2xl font-bold tracking-tight">
            HISTORIAL <span className="text-amber-400">DE MOVIMIENTOS</span>
          </h1>
        </div>
        <Link
          href="/crm/admin/inventario"
          className="px-5 py-2.5 border border-zinc-700 text-zinc-300 text-sm tracking-wider hover:border-zinc-500 transition-colors"
        >
          ← VOLVER AL STOCK
        </Link>
      </div>

      <div className="border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              {["FECHA / HORA", "TIPO", "PRODUCTO", "COLOR", "SUCURSAL", "CANTIDAD", "ROLLOS", "AUTORIZÓ", "PROVEEDOR", "NOTAS"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 tracking-widest font-normal whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-zinc-600 text-xs tracking-widest">
                  SIN MOVIMIENTOS REGISTRADOS
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs border ${badge(m.type)}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{m.product.title}</td>
                  <td className="px-4 py-3">
                    {m.color ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-zinc-700"
                          style={{ backgroundColor: m.color.hex }}
                        />
                        <span className="text-zinc-300 text-xs">{m.color.name}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {m.location === "GUATEMALA_97" ? "Guatemala 97" : "Plomo 203"}
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-400">{m.quantity.toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-300">{m.rollCount}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{m.authorizedBy}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{m.provider ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-[150px] truncate">{m.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}