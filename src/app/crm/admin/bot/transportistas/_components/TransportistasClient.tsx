"use client";

import { useState, useTransition } from "react";

type Transportista = {
  id: string;
  nombre: string;
  zona: string;
  direccion: string | null;
  telefono: string | null;
  destinos: string[];
  notas: string | null;
  activo: boolean;
};

const ZONA_INFO: Record<string, { label: string; emoji: string; bg: string; border: string }> = {
  cabeza_juarez: { label: "Cabeza de Juárez", emoji: "📍", bg: "bg-blue-50/40", border: "border-blue-200" },
  centro: { label: "Centro Histórico", emoji: "📍", bg: "bg-amber-50/40", border: "border-amber-200" },
  vallejo: { label: "Vallejo (Norte)", emoji: "📍", bg: "bg-purple-50/40", border: "border-purple-200" },
  tapo: { label: "TAPO", emoji: "📍", bg: "bg-emerald-50/40", border: "border-emerald-200" },
  otro: { label: "Otra zona", emoji: "📍", bg: "bg-neutral-50/40", border: "border-neutral-200" },
};

export default function TransportistasClient({
  initialTransportistas,
}: {
  initialTransportistas: Transportista[];
}) {
  const [transportistas, setTransportistas] = useState(initialTransportistas);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Form para edicion
  const [form, setForm] = useState<Partial<Transportista>>({
    zona: "centro",
    destinos: [],
    activo: true,
  });
  const [destinosInput, setDestinosInput] = useState("");

  // Agrupar por zona
  const porZona = transportistas.reduce<Record<string, Transportista[]>>((acc, t) => {
    if (!acc[t.zona]) acc[t.zona] = [];
    acc[t.zona].push(t);
    return acc;
  }, {});

  async function toggleActivo(id: string, activo: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/transportistas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (res.ok) {
        setTransportistas((prev) =>
          prev.map((t) => (t.id === id ? { ...t, activo } : t))
        );
      }
    });
  }

  function startEdit(t: Transportista) {
    setEditing(t.id);
    setAdding(false);
    setForm(t);
    setDestinosInput(t.destinos.join(", "));
  }

  function startAdd() {
    setAdding(true);
    setEditing(null);
    setForm({ zona: "centro", destinos: [], activo: true });
    setDestinosInput("");
  }

  function cancel() {
    setEditing(null);
    setAdding(false);
  }

  async function save() {
    const payload = {
      ...form,
      destinos: destinosInput.split(",").map((s) => s.trim()).filter(Boolean),
    };

    startTransition(async () => {
      const url = editing
        ? `/api/admin/transportistas/${editing}`
        : "/api/admin/transportistas";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error ?? res.status}`);
        return;
      }

      const data = await res.json();

      if (editing) {
        setTransportistas((prev) =>
          prev.map((t) => (t.id === editing ? data.transportista : t))
        );
      } else {
        setTransportistas((prev) => [...prev, data.transportista]);
      }

      cancel();
    });
  }

  async function deleteOne(id: string) {
    if (!confirm("¿Eliminar este transportista?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/transportistas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransportistas((prev) => prev.filter((t) => t.id !== id));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-neutral-600">
          <strong>{transportistas.length}</strong> transportistas registrados ·{" "}
          <strong>{transportistas.filter((t) => t.activo).length}</strong> activos
        </div>
        <button
          onClick={startAdd}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
        >
          + Agregar transportista
        </button>
      </div>

      {(adding || editing) && (
        <div className="rounded-xl border-2 border-blue-300 bg-blue-50/30 p-5">
          <h3 className="text-sm font-bold text-blue-900 mb-3">
            {editing ? "✏️ Editar transportista" : "➕ Nuevo transportista"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Nombre *</label>
              <input
                value={form.nombre ?? ""}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
                placeholder="Ej. Castores"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Zona *</label>
              <select
                value={form.zona ?? "centro"}
                onChange={(e) => setForm({ ...form, zona: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
              >
                <option value="cabeza_juarez">Cabeza de Juárez</option>
                <option value="centro">Centro Histórico</option>
                <option value="vallejo">Vallejo (Norte)</option>
                <option value="tapo">TAPO</option>
                <option value="otro">Otra</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                Destinos (separados por coma)
              </label>
              <input
                value={destinosInput}
                onChange={(e) => setDestinosInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
                placeholder="Ej. Chiapas - Comitán, Oaxaca, Nacional"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Teléfono</label>
              <input
                value={form.telefono ?? ""}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
                placeholder="55 1234 5678"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Dirección</label>
              <input
                value={form.direccion ?? ""}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
                placeholder="Calle, número, colonia"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Notas</label>
              <textarea
                value={form.notas ?? ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
                rows={2}
                placeholder="Especialidad, horarios, tips..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={isPending || !form.nombre}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "💾 Guardar"}
            </button>
            <button
              onClick={cancel}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {Object.entries(porZona).map(([zona, lista]) => {
        const info = ZONA_INFO[zona] ?? ZONA_INFO.otro;
        return (
          <section
            key={zona}
            className={`rounded-xl border ${info.border} ${info.bg} p-5`}
          >
            <h3 className="text-sm font-bold uppercase text-neutral-900 mb-3 flex items-center gap-2">
              <span>{info.emoji}</span>
              <span>{info.label}</span>
              <span className="text-xs font-normal text-neutral-500">
                · {lista.length} transportista{lista.length !== 1 ? "s" : ""}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lista.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-lg bg-white border ${
                    t.activo ? "border-neutral-200" : "border-neutral-200 opacity-50"
                  } p-3 text-sm`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-neutral-900">{t.nombre}</div>
                      {t.destinos.length > 0 && (
                        <div className="text-xs text-neutral-600 mt-1">
                          → {t.destinos.join(", ")}
                        </div>
                      )}
                      {t.notas && (
                        <div className="text-xs text-neutral-500 italic mt-1">{t.notas}</div>
                      )}
                    </div>
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.activo}
                        onChange={(e) => toggleActivo(t.id, e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span>{t.activo ? "activo" : "inactivo"}</span>
                    </label>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => startEdit(t)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteOne(t.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}