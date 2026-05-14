"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Contacto {
  id: string;
  phone: string;
  nombre?: string | null;
  empresa?: string | null;
  notas?: string | null;
  plantillaEnviada: boolean;
  plantillaEnviadaAt?: Date | null;
  plantillaResponse?: string | null;
  clienteRespondio: boolean;
  primeraRespuestaAt?: Date | null;
  createdAt: Date;
}

export default function ContactosTable({
  contactos,
}: {
  contactos: Contacto[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleEnviar(contactoId: string) {
    if (loadingId) return;
    setLoadingId(contactoId);
    try {
      const res = await fetch(`/api/admin/bot/contactos/${contactoId}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error ?? "no se pudo enviar"}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleEliminar(contactoId: string) {
    if (!confirm("¿Eliminar este contacto? No se puede deshacer.")) return;
    if (loadingId) return;
    setLoadingId(contactoId);
    try {
      const res = await fetch(`/api/admin/bot/contactos/${contactoId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (contactos.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-400">
        No hay contactos. Agrega uno arriba.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Contacto</th>
            <th className="text-left px-3 py-2 font-medium">Empresa</th>
            <th className="text-left px-3 py-2 font-medium">Plantilla</th>
            <th className="text-left px-3 py-2 font-medium">Respondió</th>
            <th className="text-right px-3 py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {contactos.map((c) => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-3 py-2">
                <div className="font-medium">{c.nombre ?? "—"}</div>
                <div className="text-xs text-slate-500 font-mono">{c.phone}</div>
                {c.notas && (
                  <div className="text-xs text-slate-400 italic mt-1">
                    {c.notas}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-sm">{c.empresa ?? "—"}</td>
              <td className="px-3 py-2 text-xs">
                {c.plantillaEnviada ? (
                  <div>
                    <span className="text-emerald-700">✓ Enviada</span>
                    <div className="text-slate-500">
                      {c.plantillaEnviadaAt
                        ? new Date(c.plantillaEnviadaAt).toLocaleString("es-MX")
                        : ""}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">No enviada</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs">
                {c.clienteRespondio ? (
                  <div>
                    <span className="text-emerald-700">✓ Sí</span>
                    <div className="text-slate-500">
                      {c.primeraRespuestaAt
                        ? new Date(c.primeraRespuestaAt).toLocaleString("es-MX")
                        : ""}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex gap-1 justify-end">
                  {!c.plantillaEnviada && (
                    <button
                      disabled={loadingId === c.id}
                      onClick={() => handleEnviar(c.id)}
                      className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                    >
                      📤 Enviar plantilla
                    </button>
                  )}
                  <button
                    disabled={loadingId === c.id}
                    onClick={() => handleEliminar(c.id)}
                    className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
