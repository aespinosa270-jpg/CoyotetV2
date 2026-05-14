"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContactosForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [notas, setNotas] = useState("");
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
