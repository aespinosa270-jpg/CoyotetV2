"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContactosForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [notas, setNotas] = useState("");
  const [origen, setOrigen] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      setError("Teléfono debe ser 10-15 dígitos (E.164 sin +)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/bot/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          nombre: nombre || undefined,
          empresa: empresa || undefined,
          notas: notas || undefined,
          origenCarga: origen,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error desconocido");
        return;
      }
      setPhone("");
      setNombre("");
      setEmpresa("");
      setNotas("");
      setOrigen("manual");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <input
        type="tel"
        placeholder="Teléfono (5215551234567)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="px-3 py-2 border border-slate-300 rounded text-sm"
      />
      <input
        type="text"
        placeholder="Nombre (opcional)"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded text-sm"
      />
      <input
        type="text"
        placeholder="Empresa (opcional)"
        value={empresa}
        onChange={(e) => setEmpresa(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded text-sm"
      />
      <input
        type="text"
        placeholder="Notas (opcional)"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded text-sm"
      />
      <select
        value={origen}
        onChange={(e) => setOrigen(e.target.value)}
        className="col-span-2 px-3 py-2 border border-slate-300 rounded text-sm bg-white"
      >
        <option value="manual">Manual (yo lo agregue)</option>
        <option value="lista_antigua">Lista antigua (clientes pasados)</option>
        <option value="ads_meta">Facebook / Instagram Ads</option>
        <option value="ads_google">Google Ads</option>
        <option value="ads_tiktok">TikTok Ads</option>
        <option value="referido">Referido por cliente</option>
        <option value="evento">Evento / Feria</option>
        <option value="otro">Otro</option>
      </select>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? "Agregando..." : "Agregar contacto"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
