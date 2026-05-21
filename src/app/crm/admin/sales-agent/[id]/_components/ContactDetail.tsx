"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string; email: string; role: string };
type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
};
type Attempt = {
  id: string;
  channel: string;
  messageSent: string;
  strategy: string | null;
  sentAt: string;
  outcome: string | null;
  respondedAt: string | null;
  responseText: string | null;
  sentByEmployee: { id: string; name: string } | null;
};
type Feedback = {
  id: string;
  feedback: string;
  category: string | null;
  createdAt: string;
  employee: { id: string; name: string };
};
type Contact = {
  id: string;
  phone: string;
  nombre: string | null;
  empresa: string | null;
  notas: string | null;
  status: string;
  engagementScore: number;
  reactivationPriority: number;
  totalAttempts: number;
  clienteRespondio: boolean;
  plantillaEnviadaAt: string | null;
  primeraRespuestaAt: string | null;
  tags: string[];
  coldReason: string | null;
  nextFollowUpAt: string | null;
  assignedToEmployeeId: string | null;
  assignedToEmployee: Employee | null;
  attempts: Attempt[];
  feedbacks: Feedback[];
  createdAt: string;
  updatedAt: string;
};

const STATUSES = ["PENDING", "CONTACTED", "INTERESTED", "CONVERTED", "LOST", "DO_NOT_CONTACT"];

const FEEDBACK_CATEGORIES = [
  { value: "", label: "— Sin categoría —" },
  { value: "timing", label: "Timing" },
  { value: "pricing", label: "Pricing" },
  { value: "product_fit", label: "Product fit" },
  { value: "communication_style", label: "Communication style" },
];

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContactDetail({
  contact: initial,
  employees,
  orders,
}: {
  contact: Contact;
  employees: Employee[];
  orders: Order[];
}) {
  const [contact, setContact] = useState<Contact>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [fbText, setFbText] = useState("");
  const [fbCategory, setFbCategory] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);

  async function patch(data: Partial<Contact>) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/sales-agent/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const j = await res.json();
        setContact((prev) => ({ ...prev, ...j.contact }));
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error ?? res.status}`);
      }
    });
  }

  async function submitFeedback() {
    if (!fbText.trim()) return;
    setFbSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sales-agent/contacts/${contact.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: fbText.trim(),
          category: fbCategory || undefined,
        }),
      });
      if (res.ok) {
        const j = await res.json();
        setContact((prev) => ({ ...prev, feedbacks: [j.feedback, ...prev.feedbacks] }));
        setFbText("");
        setFbCategory("");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error ?? res.status}`);
      }
    } finally {
      setFbSubmitting(false);
    }
  }

  const displayName =
    contact.nombre && !/^\d+$/.test(contact.nombre) ? contact.nombre : contact.phone;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{displayName}</h2>
              <p className="text-sm text-neutral-500">{contact.phone}</p>
              {contact.empresa && <p className="text-sm text-neutral-500">{contact.empresa}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  contact.reactivationPriority >= 60
                    ? "bg-orange-100 text-orange-700"
                    : contact.reactivationPriority >= 30
                    ? "bg-amber-100 text-amber-700"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                Prioridad: {contact.reactivationPriority}
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                Engagement: {contact.engagementScore}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">Plantilla enviada</p>
              <p className="font-medium text-neutral-900">{fmtDateTime(contact.plantillaEnviadaAt)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Primera respuesta</p>
              <p className="font-medium text-neutral-900">
                {contact.clienteRespondio ? fmtDateTime(contact.primeraRespuestaAt) : "— No respondió"}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Total intentos</p>
              <p className="font-medium text-neutral-900">{contact.totalAttempts}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Agregado</p>
              <p className="font-medium text-neutral-900">{fmtDateTime(contact.createdAt)}</p>
            </div>
          </div>

          {contact.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1 border-t border-neutral-100 pt-4">
              {contact.tags.map((t) => (
                <span key={t} className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {orders.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">
              💳 Órdenes previas — Cliente mina de oro
            </h3>
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
                  <div>
                    <div className="font-medium text-neutral-900">{o.orderNumber}</div>
                    <div className="text-xs text-neutral-500">{fmtDateTime(o.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-900">${o.total.toLocaleString("es-MX")}</div>
                    <div className="text-xs text-neutral-500">{o.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-700">
            📨 Intentos previos ({contact.attempts.length})
          </h3>
          {contact.attempts.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Sin intentos del Sales Agent aún. En Fase 2 podrás generar el primer mensaje con IA.
            </p>
          ) : (
            <div className="space-y-3">
              {contact.attempts.map((a) => (
                <div key={a.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">
                      {a.channel} · {a.sentByEmployee?.name ?? "auto"} · {fmtDateTime(a.sentAt)}
                    </span>
                    {a.outcome && (
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">{a.outcome}</span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{a.messageSent}</p>
                  {a.responseText && (
                    <div className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-900">
                      <strong>Respondió:</strong> {a.responseText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-700">
            💬 Feedback de vendedoras ({contact.feedbacks.length})
          </h3>

          <div className="mb-4 space-y-2">
            <textarea
              value={fbText}
              onChange={(e) => setFbText(e.target.value)}
              placeholder='Ej: "No insiste mucho, prefiere comparar antes de cerrar"'
              className="w-full rounded-lg border border-neutral-300 p-2 text-sm focus:border-amber-400 focus:outline-none"
              rows={3}
            />
            <div className="flex gap-2">
              <select
                value={fbCategory}
                onChange={(e) => setFbCategory(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                onClick={submitFeedback}
                disabled={fbSubmitting || !fbText.trim()}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {fbSubmitting ? "Guardando…" : "Guardar feedback"}
              </button>
            </div>
          </div>

          {contact.feedbacks.length > 0 && (
            <div className="space-y-2">
              {contact.feedbacks.map((f) => (
                <div key={f.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      <strong className="text-neutral-700">{f.employee.name}</strong>
                      {f.category && ` · ${f.category}`}
                    </span>
                    <span>{fmtDateTime(f.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{f.feedback}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {contact.notas && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-700">
              🧠 Contexto del bot V2
            </h3>
            <pre className="whitespace-pre-wrap text-xs text-neutral-800">{contact.notas}</pre>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-700">Estado</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Status</label>
              <select
                value={contact.status}
                onChange={(e) => patch({ status: e.target.value })}
                disabled={pending}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Asignar a</label>
              <select
                value={contact.assignedToEmployeeId ?? ""}
                onChange={(e) => patch({ assignedToEmployeeId: e.target.value || null } as any)}
                disabled={pending}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— Sin asignar —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Cold reason</label>
              <input
                type="text"
                defaultValue={contact.coldReason ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (contact.coldReason ?? "")) {
                    patch({ coldReason: e.target.value || null } as any);
                  }
                }}
                placeholder="ej: precio alto, no respondió"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Next follow-up</label>
              <input
                type="date"
                defaultValue={contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toISOString().slice(0, 10) : ""}
                onChange={(e) => patch({ nextFollowUpAt: e.target.value || null } as any)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">⏭ Próxima fase</p>
          <p className="mt-1 text-xs">
            En Fase 2 aquí aparecerá el botón <strong>"Analizar con IA"</strong> que genera situación + estrategia + mensaje listo para WhatsApp.
          </p>
        </div>
      </aside>
    </div>
  );
}