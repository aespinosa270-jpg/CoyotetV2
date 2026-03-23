import { getMovementHistory } from "@/app/actions/inventory";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, RefreshCcw, Search } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HistorialPage() {
  const movements = await getMovementHistory(200);

  const getBadgeClass = (type: string) => {
    if (type === "ENTRADA") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (type === "SALIDA")  return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  };

  const getIcon = (type: string) => {
    if (type === "ENTRADA") return <ArrowUpRight size={12} />;
    if (type === "SALIDA")  return <ArrowDownLeft size={12} />;
    return <RefreshCcw size={12} />;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-8">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase mb-1 font-black">Auditoría de Almacén</p>
            <h1 className="text-3xl font-bold tracking-tighter italic uppercase">
              BITÁCORA <span className="text-amber-400">OPERACIONAL</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Registros en caché</p>
              <p className="text-xs font-bold text-zinc-400">{movements.length} Movimientos</p>
            </div>
            <Link
              href="/crm/admin/inventario"
              className="flex items-center gap-2 px-6 py-3 border border-zinc-800 text-zinc-400 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white transition-all rounded-sm"
            >
              <ArrowLeft size={14} /> VOLVER AL KARDEX
            </Link>
          </div>
        </div>

        {/* Tabla de Auditoría */}
        <div className="border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800">
                  {[
                    "FECHA / HORA", "TIPO", "PRODUCTO", "COLOR", 
                    "SUCURSAL", "CANTIDAD", "ROLLOS", "AUTORIZÓ", 
                    "PROVEEDOR", "NOTAS"
                  ].map((h) => (
                    <th key={h} className="px-5 py-4 text-[9px] text-zinc-500 tracking-[0.2em] font-black uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-20 text-center text-zinc-700 text-[10px] tracking-[0.3em] font-black uppercase">
                      NO SE ENCONTRARON REGISTROS EN EL HISTORIAL
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[11px] text-zinc-400 leading-none">
                          {new Date(m.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short", year: "numeric",
                          }).toUpperCase()}
                        </p>
                        <p className="text-[9px] text-zinc-600 mt-1 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString("es-MX", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`flex items-center gap-1.5 w-fit px-2 py-1 text-[9px] font-black border rounded-sm tracking-tighter ${getBadgeClass(m.type)}`}>
                          {getIcon(m.type)}
                          {m.type}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[11px] font-black text-zinc-100 group-hover:text-amber-400 transition-colors uppercase truncate max-w-[180px]">
                          {m.product.title}
                        </p>
                        <p className="text-[9px] text-zinc-600 mt-0.5 font-mono">{m.product.sku}</p>
                      </td>
                      <td className="px-5 py-4">
                        {m.color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0" 
                              style={{ backgroundColor: m.color.hex }} 
                            />
                            <span className="text-[10px] text-zinc-400 uppercase font-bold">{m.color.name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-700 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          {m.location === "GUATEMALA_97" ? "Guatemala #97" : "Plomo #203"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className={`text-sm font-black font-mono ${m.type === 'SALIDA' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {m.type === 'SALIDA' ? '-' : '+'}{m.quantity.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[11px] text-zinc-300 font-bold">{m.rollCount}</p>
                        <p className="text-[8px] text-zinc-700 uppercase font-black tracking-tighter">Rollos</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">{m.authorizedBy}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[10px] text-zinc-500 uppercase truncate max-w-[100px] font-bold">
                          {m.provider ?? "SISTEMA"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-[200px]">
                          <p className="text-[10px] text-zinc-600 italic leading-tight line-clamp-2" title={m.notes ?? ""}>
                            {m.notes ?? "Sin observaciones"}
                          </p>
                          {m.orderId && (
                            <p className="text-[8px] text-amber-500/50 mt-1 font-black uppercase tracking-tighter">
                              Ref: {m.orderId.slice(-8)}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 flex items-center justify-between border-t border-zinc-900 pt-6">
          <p className="text-[9px] text-zinc-700 uppercase tracking-[0.2em]">
            Mostrando últimos 200 eventos · Coyote Textil S.A. de C.V.
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] text-zinc-600 uppercase font-black">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[8px] text-zinc-600 uppercase font-black">Salidas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}