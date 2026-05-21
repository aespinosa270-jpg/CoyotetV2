"use client";

import { useEffect, useState, useCallback } from "react";

type Event = {
  id: string;
  type: string;
  outcome: string | null;
  channel: string | null;
  messageSent: string | null;
  responseText: string | null;
  notas: string | null;
  trustDelta: number;
  triggeredAt: string;
  respondedAt: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    trustScore: number;
    trustEvents: number;
    ltv: number;
  } | null;
  order: {
    id: string;
    orderNumber: string;
    total: number;
    customerName: string;
    deliveredAt: string | null;
  } | null;
};

type Stats = {
  pending: number;
  positiveResponse: number;
  complaint: number;
  noResponse: number;
  total: number;
};

const TYPE_LABELS: Record<string, string> = {
  post_delivery_7d: "📦 Check D+7",
  re_engagement_30d: "🔄 Re-engagement D+30",
  order_delivered_on_time: "✅ Entrega exitosa",
  aftercare_positive: "😊 Respuesta positiva",
  aftercare_complaint: "😟 Queja",
};

function trustBadge(score: number) {
  if (score >= 90) return { label: "🌟 Fan", cls: "bg-emerald-100 text-emerald-800" };
  if (score >= 75) return { label: "✅ Confiable", cls: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { label: "· Neutral", cls: "bg-neutral-100 text-neutral-700" };
  if (score >= 30) return { label: "⚠ Vigilar", cls: "bg-amber-100 text-amber-800" };
  return { label: "🚫 Riesgo", cls: "bg-red-100 text-red-800" };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function AftercareClient() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("ALL");
  const [generating, setGenerating] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/aftercare?status=${status}&type=${type}`, { cache: "no-store" });
      const data = await res.json();
      setEvents(data.events);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function generateMessage(eventId: string) {
    setGenerating(eventId);
    try {
      const res = await fetch(`/api/admin/aftercare/${eventId}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error}`);
        return;
      }
      const data = await res.json();
      setDraftMessages((prev) => ({ ...prev, [eventId]: data.mensaje }));
    } finally {
      setGenerating(null);
    }
  }

  async function markAsSent(eventId: string) {
    const msg = draftMessages[eventId];
    if (!msg) return;
    if (msg) navigator.clipboard.writeText(msg);

    const res = await fetch(`/api/admin/aftercare/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageSent: msg, outcome: "no_response", notas: "Enviado por vendedora" }),
    });

    if (res.ok) {
      alert("Mensaje copiado al portapapeles + marcado enviado. Pega en WhatsApp del cliente.");
      fetchData();
    }
  }

  async function markOutcome(eventId: string, outcome: "positive_response" | "complaint") {
    const responseText = prompt(
      outcome === "positive_response"
        ? "¿Qué respondió el cliente? (opcional)"
        : "¿Cuál fue la queja del cliente?"
    );

    const res = await fetch(`/api/admin/aftercare/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome,
        responseText,
        applyTrustEvent: true,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.trustUpdate) {
        alert(`Trust actualizado: ${data.trustUpdate.oldScore} → ${data.trustUpdate.newScore} (${data.trustUpdate.delta > 0 ? "+" : ""}${data.trustUpdate.delta})`);
      }
      fetchData();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
            <div className="text-2xl font-bold text-amber-800">{stats.pending}</div>
            <div className="text-xs uppercase text-amber-700">Pendientes</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-800">{stats.positiveResponse}</div>
            <div className="text-xs uppercase text-emerald-700">Respuesta+</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
            <div className="text-2xl font-bold text-red-800">{stats.complaint}</div>
            <div className="text-xs uppercase text-red-700">Quejas</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
            <div className="text-2xl font-bold text-neutral-800">{stats.noResponse}</div>
            <div className="text-xs uppercase text-neutral-700">Sin resp</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
            <div className="text-xs uppercase text-blue-700">Total</div>
          </div>
        </div>
      )}

      <div className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="pending">Pendientes</option>
          <option value="positive_response">Respuesta positiva</option>
          <option value="complaint">Quejas</option>
          <option value="no_response">Sin respuesta</option>
          <option value="ALL">Todas</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="ALL">Todos los tipos</option>
          <option value="post_delivery_7d">📦 Check D+7</option>
          <option value="re_engagement_30d">🔄 Re-engagement D+30</option>
        </select>
        <button onClick={fetchData} className="ml-auto rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs hover:bg-neutral-50">↻ Refrescar</button>
      </div>

      <div className="space-y-3">
        {loading && <div className="rounded-xl bg-white p-8 text-center text-neutral-500">Cargando…</div>}
        {!loading && events.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-neutral-500">Sin eventos con estos filtros.</div>
        )}
        {!loading && events.map((e) => {
          const trust = e.user ? trustBadge(e.user.trustScore) : null;
          const isGenerating = generating === e.id;
          const draft = draftMessages[e.id];

          return (
            <div key={e.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">{TYPE_LABELS[e.type] ?? e.type}</span>
                    {trust && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${trust.cls}`}>{trust.label} ({e.user?.trustScore})</span>}
                  </div>
                  <div className="font-semibold text-neutral-900">{e.user?.name ?? e.order?.customerName ?? "Cliente bot"}</div>
                  <div className="text-xs text-neutral-500">{e.user?.phone}</div>
                  {e.order && (
                    <div className="text-xs text-neutral-600 mt-1">
                      {e.order.orderNumber} · ${e.order.total.toLocaleString("es-MX")} · Entregado {fmtDate(e.order.deliveredAt)}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-neutral-500">
                  Trigger: {fmtDate(e.triggeredAt)}<br />
                  {e.user && <>LTV: ${e.user.ltv.toLocaleString("es-MX")}</>}
                </div>
              </div>

              {e.notas && <p className="mb-3 text-xs italic text-neutral-600">{e.notas}</p>}

              {e.messageSent && (
                <div className="mb-3 rounded-lg bg-neutral-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Mensaje enviado</p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-900">{e.messageSent}</p>
                </div>
              )}

              {e.responseText && (
                <div className="mb-3 rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 mb-1">Respuesta cliente</p>
                  <p className="whitespace-pre-wrap text-sm text-emerald-900">{e.responseText}</p>
                </div>
              )}

              {e.outcome === "pending" && !e.messageSent && (
                <>
                  {!draft && (
                    <button
                      onClick={() => generateMessage(e.id)}
                      disabled={isGenerating}
                      className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {isGenerating ? "Generando con IA…" : "🧠 Generar mensaje con IA"}
                    </button>
                  )}

                  {draft && (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700 mb-1">Mensaje propuesto</p>
                        <textarea
                          value={draft}
                          onChange={(e2) => setDraftMessages((prev) => ({ ...prev, [e.id]: e2.target.value }))}
                          className="w-full bg-white border border-emerald-200 rounded p-2 text-sm"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => markAsSent(e.id)}
                          className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                        >
                          📋 Copiar + Marcar enviado
                        </button>
                        <button
                          onClick={() => generateMessage(e.id)}
                          className="rounded-md border border-amber-400 bg-white px-3 py-2 text-sm text-amber-700"
                        >
                          🔄 Regenerar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(e.outcome === "no_response" || e.messageSent) && e.outcome !== "positive_response" && e.outcome !== "complaint" && (
                <div className="flex gap-2 border-t border-neutral-100 pt-3">
                  <button
                    onClick={() => markOutcome(e.id, "positive_response")}
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                  >
                    😊 Respondió positivo (+3 trust)
                  </button>
                  <button
                    onClick={() => markOutcome(e.id, "complaint")}
                    className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    😟 Reportó queja (-3 trust)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}