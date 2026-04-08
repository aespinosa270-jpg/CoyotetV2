import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // Para que siempre traiga datos frescos

export default async function AuditMonitorPage() {
  // 1. Proteger la página para que solo ADMINS la vean
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/crm"); // Si no es admin, lo mandamos al inicio del CRM
  }

  // 2. Traemos los últimos 100 movimientos de la base de datos
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { timestamp: "desc" },
    include: { 
      employee: {
        select: { name: true, role: true }
      } 
    }
  });

  // Helper para pintar colores según la acción
  const getBadgeColor = (action: string) => {
    if (action.includes("CREATE")) return "bg-green-100 text-green-800 border-green-200";
    if (action.includes("UPDATE")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (action.includes("DELETE") || action.includes("CANCEL")) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Monitor de Actividad</h1>
        <p className="text-gray-500 mt-2">Rastreo en tiempo real de las acciones del equipo y del sistema.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-medium">Fecha y Hora</th>
                <th className="p-4 font-medium">Responsable</th>
                <th className="p-4 font-medium">Acción</th>
                <th className="p-4 font-medium">Detalle (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {logs.map((log) => {
                // Le damos un tipado seguro al JSON para que TS no llore
                const meta = log.metadata as Record<string, any> | null;

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    {/* Fecha */}
                    <td className="p-4 whitespace-nowrap text-gray-600">
                      {log.timestamp.toLocaleString('es-MX', { 
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </td>
                    
                    {/* Agente o Sistema */}
                    <td className="p-4 whitespace-nowrap">
                      {log.employee ? (
                        <div>
                          <p className="font-semibold text-gray-900">{log.employee.name}</p>
                          <p className="text-xs text-gray-500">{log.employee.role}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-600">
                          🤖 SISTEMA
                        </span>
                      )}
                    </td>

                    {/* Etiqueta de Acción */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Resumen y Metadata (El Chisme) */}
                    <td className="p-4 max-w-md">
                      <p className="text-gray-900 font-medium mb-1 truncate" title={meta?.summary || ""}>
                        {meta?.summary || "Sin resumen"}
                      </p>
                      {/* Renderizamos el JSON bonito y scrolleable */}
                      <div className="bg-gray-900 text-green-400 p-2 rounded text-xs overflow-x-auto max-h-32">
                        <pre>
                          {JSON.stringify(meta, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No hay registros de auditoría todavía. ¡Ve a moverle a algo!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}