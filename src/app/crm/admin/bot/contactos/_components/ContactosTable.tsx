"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import LlamarButton from "../../_components/LlamarButton";

interface Contacto {
  id: string;
  phone: string;
  nombre?: string | null;
  empresa?: string | null;
  notas?: string | null;
  plantillaEnviada: boolean;
  plantillaEnviadaAt?: Date | string | null;
  plantillaResponse?: string | null;
  clienteRespondio: boolean;
  primeraRespuestaAt?: Date | string | null;
  createdAt: Date | string;
}

const PAGE_SIZE = 50;

export default function ContactosTable({
  contactos,
}: {
  contactos: Contacto[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [plantillaSel, setPlantillaSel] = useState<"BIENVENIDA" | "OFERTA_REACTIVACION">("BIENVENIDA");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendientes" | "enviados" | "respondieron">("todos");
  const [page, setPage] = useState(0);

  // Filtrar + buscar
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contactos.filter((c) => {
      // Filtro de status
      if (filterStatus === "pendientes" && c.plantillaEnviada && c.clienteRespondio)
        return false;
      if (filterStatus === "pendientes" && !c.plantillaEnviada) {
        // Pendientes = no enviada O enviada sin respuesta
        // Aquí ya pasó (no respondió), lo dejamos
      }
      if (filterStatus === "pendientes") {
        if (!(!c.plantillaEnviada || (c.plantillaEnviada && !c.clienteRespondio)))
          return false;
      }
      if (filterStatus === "enviados" && !c.plantillaEnviada) return false;
      if (filterStatus === "respondieron" && !c.clienteRespondio) return false;

      // Búsqueda libre
      if (!q) return true;
      const haystack = [
        c.phone,
        c.nombre ?? "",
        c.empresa ?? "",
        c.notas ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [contactos, search, filterStatus]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleEnviar(contactoId: string) {
    if (loadingId) return;
    setLoadingId(contactoId);
    try {
      const res = await fetch(`/api/admin/bot/contactos/${contactoId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: plantillaSel }),
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
    <div className="space-y-3">
      {/* Controles: buscador + filtro */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-md p-3">
        <input
          type="text"
          placeholder="🔍 Buscar por teléfono, nombre, empresa o notas..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="flex-1 min-w-[250px] px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as any);
            setPage(0);
          }}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        >
          <option value="todos">Todos ({contactos.length})</option>
          <option value="pendientes">Pendientes</option>
          <option value="enviados">Plantilla enviada</option>
          <option value="respondieron">Respondieron</option>
        </select>
        <select
          value={plantillaSel}
          onChange={(e) => setPlantillaSel(e.target.value as "BIENVENIDA" | "OFERTA_REACTIVACION")}
          className="px-3 py-2 border border-amber-300 bg-amber-50 rounded text-sm font-medium"
          title="Plantilla que se enviara al hacer click en Enviar"
        >
          <option value="BIENVENIDA">📋 Bienvenida</option>
          <option value="OFERTA_REACTIVACION">🔥 Oferta reactivación</option>
        </select>
      </div>

      {/* Info de resultados */}
      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <span>
          Mostrando <strong>{paginated.length}</strong> de{" "}
          <strong>{filtered.length}</strong> contactos
          {search && ` (filtrado de ${contactos.length})`}
        </span>
        {totalPages > 1 && (
          <span>
            Página {page + 1} de {totalPages}
          </span>
        )}
      </div>

      {/* Tabla */}
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
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  Sin resultados para esta búsqueda
                </td>
              </tr>
            ) : (
              paginated.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">
                      {c.nombre || "(sin nombre)"}
                    </div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {c.empresa || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {c.plantillaEnviada ? (
                      <div>
                        <span className="text-emerald-600 font-medium">
                          ✓ Enviada
                        </span>
                        <div className="text-xs text-slate-400">
                          {fmt(c.plantillaEnviadaAt)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.clienteRespondio ? (
                      <div>
                        <span className="text-blue-600 font-medium">
                          ✓ Sí
                        </span>
                        <div className="text-xs text-slate-400">
                          {fmt(c.primeraRespuestaAt)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    <LlamarButton phone={c.phone} variant="secondary" size="sm" label="" />
                    {!c.plantillaEnviada && (
                      <button
                        onClick={() => handleEnviar(c.id)}
                        disabled={loadingId === c.id}
                        className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded"
                      >
                        {loadingId === c.id ? "..." : "📤 Enviar"}
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminar(c.id)}
                      disabled={loadingId === c.id}
                      className="px-2 py-1 text-xs bg-slate-200 hover:bg-red-100 hover:text-red-700 rounded"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            onClick={() => setPage(0)}
            disabled={page === 0}
            className="px-2 py-1 text-xs bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded"
          >
            ‹ Anterior
          </button>
          <span className="px-3 py-1 text-sm bg-slate-100 rounded">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-sm bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded"
          >
            Siguiente ›
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 text-xs bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

function fmt(d?: Date | string | null): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}