"use client";

import { useEffect, useRef, useState } from "react";
import { AsyncButton } from "./AsyncButton";

interface ServiceStatus {
  ok: boolean;
  latencyMs?: number;
  message?: string;
  data?: Record<string, unknown>;
}

interface HealthResponse {
  ok: boolean;
  redis: ServiceStatus;
  supabase: ServiceStatus;
  openai: ServiceStatus;
  meta: ServiceStatus;
  stripe: ServiceStatus;
  timestamp: string;
}

const AUTO_REFRESH_MS = 30_000;

export function HealthDashboardClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [clearPhone, setClearPhone] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const lastFetchRef = useRef<number>(Date.now());

  async function fetchHealth() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bot/health", { cache: "no-store" });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
      lastFetchRef.current = Date.now();
      setSecondsAgo(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  // Contador "hace X segundos"
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-4">
      {/* Banner global */}
      {health && !health.ok && (
        <div className="bg-red-50 border-2 border-red-300 rounded-md p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🚨</div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900">Servicios degradados</h3>
              <p className="text-sm text-red-700 mt-1">
                Uno o más servicios no responden correctamente. Revisa los detalles abajo.
              </p>
            </div>
          </div>
        </div>
      )}
      {health && health.ok && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✅</div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900">Todos los sistemas operacionales</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Los 5 servicios responden correctamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controles */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Conectividad de servicios
            </h2>
            {health && (
              <p className="text-xs text-slate-400 mt-1">
                Última verificación: hace {secondsAgo}s ·{" "}
                {new Date(health.timestamp).toLocaleTimeString("es-MX")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh 30s
            </label>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
            >
              {loading ? "Verificando..." : "↻ Verificar ahora"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <p className="text-sm text-red-700">Error al consultar: {error}</p>
          </div>
        )}

        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ServiceCard
              id="redis"
              name="Redis (Upstash)"
              icon="⚡"
              status={health.redis}
              expanded={expandedCard === "redis"}
              onToggle={() => setExpandedCard(expandedCard === "redis" ? null : "redis")}
              description="Memoria del bot, historial, cache"
            />
            <ServiceCard
              id="supabase"
              name="Supabase pgvector"
              icon="🗄️"
              status={health.supabase}
              expanded={expandedCard === "supabase"}
              onToggle={() => setExpandedCard(expandedCard === "supabase" ? null : "supabase")}
              description="DB principal + embeddings RAG"
              extra={
                health.supabase.data?.embeddingsCount !== undefined
                  ? `${health.supabase.data.embeddingsCount} embeddings`
                  : null
              }
            />
            <ServiceCard
              id="openai"
              name="OpenAI GPT-4o"
              icon="🧠"
              status={health.openai}
              expanded={expandedCard === "openai"}
              onToggle={() => setExpandedCard(expandedCard === "openai" ? null : "openai")}
              description="Cerebro del bot"
              extra={
                health.openai.data?.modelsAvailable !== undefined
                  ? `${health.openai.data.modelsAvailable} modelos disponibles`
                  : null
              }
            />
            <ServiceCard
              id="meta"
              name="Meta WhatsApp API"
              icon="💬"
              status={health.meta}
              expanded={expandedCard === "meta"}
              onToggle={() => setExpandedCard(expandedCard === "meta" ? null : "meta")}
              description="Envío/recepción de mensajes"
              extra={
                health.meta.data?.verifiedName
                  ? `${health.meta.data.verifiedName} · ${health.meta.data.phoneNumber ?? "n/a"}`
                  : null
              }
              warning={
                health.meta.data?.qualityRating &&
                health.meta.data.qualityRating !== "GREEN"
                  ? `⚠️ Calidad: ${health.meta.data.qualityRating}`
                  : null
              }
            />
            <ServiceCard
              id="stripe"
              name="Stripe"
              icon="💳"
              status={health.stripe}
              expanded={expandedCard === "stripe"}
              onToggle={() => setExpandedCard(expandedCard === "stripe" ? null : "stripe")}
              description="Cobros con tarjeta"
              extra={
                health.stripe.data?.availableAmount !== undefined
                  ? `$${formatMoney(Number(health.stripe.data.availableAmount))} ${health.stripe.data.currency ?? ""} disponible`
                  : null
              }
            />
          </div>
        )}
      </section>

      {/* Acciones */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Acciones de mantenimiento
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              Reindexar catálogo en pgvector
            </p>
            <p className="text-xs text-slate-500 mb-2">
              Regenera los embeddings de todos los productos. Útil si agregaste
              productos custom completamente nuevos.
            </p>
            <AsyncButton
              endpoint="/api/admin/bot/reindex"
              label="Reindexar ahora"
              labelLoading="Indexando..."
              confirmMessage="Esto puede tomar 3-5 segundos y consumir ~3000 tokens de OpenAI. ¿Continuar?"
              variant="secondary"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-900 mb-1">
              Limpiar inteligencia de un cliente
            </p>
            <p className="text-xs text-slate-500 mb-2">
              Borra memoria episódica, objeciones acumuladas y resumen semántico.
              NO borra historial ni perfil. Útil cuando el bot aprendió algo
              incorrecto sobre alguien.
            </p>
            <div className="flex gap-2 items-start flex-wrap">
              <input
                type="text"
                value={clearPhone}
                onChange={(e) => setClearPhone(e.target.value)}
                placeholder="5215551234567"
                className="text-sm border border-slate-200 rounded p-2 w-64 focus:outline-none focus:border-blue-500"
              />
              <AsyncButton
                endpoint="/api/admin/bot/clear-memoria"
                body={{
                  phone: clearPhone,
                  clearMemoria: true,
                  clearObjeciones: true,
                  clearResumen: true,
                }}
                label="Limpiar memoria"
                confirmMessage={`Esto borrará la memoria, objeciones y resumen de ${clearPhone || "ese cliente"}. ¿Continuar?`}
                variant="danger"
              />
              <AsyncButton
                endpoint="/api/admin/bot/reset-counters"
                body={{ phone: clearPhone }}
                label="Reset counters"
                confirmMessage={`Esto reseteará el contador de alucinaciones y consent re-ask para ${clearPhone || "ese cliente"}. ¿Continuar?`}
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function ServiceCard({
  id,
  name,
  icon,
  status,
  description,
  extra,
  warning,
  expanded,
  onToggle,
}: {
  id: string;
  name: string;
  icon: string;
  status: ServiceStatus;
  description?: string;
  extra?: string | null;
  warning?: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ok = status.ok;
  const borderColor = ok ? "border-emerald-300" : "border-red-300";
  const bgColor = ok ? "bg-emerald-50" : "bg-red-50";
  const dotColor = ok ? "bg-emerald-500" : "bg-red-500";
  const textColor = ok ? "text-emerald-900" : "text-red-900";

  const latencyClass =
    !status.latencyMs
      ? "text-slate-500"
      : status.latencyMs < 500
        ? "text-emerald-700"
        : status.latencyMs < 1500
          ? "text-amber-700"
          : "text-red-700";

  return (
    <div
      className={`border-2 rounded-md ${borderColor} ${bgColor} transition cursor-pointer hover:shadow-md`}
      onClick={onToggle}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <div>
              <p className={`text-sm font-bold ${textColor}`}>{name}</p>
              {description && (
                <p className="text-xs text-slate-500">{description}</p>
              )}
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${dotColor} flex-shrink-0 mt-1`} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs font-mono font-bold ${latencyClass}`}>
            {ok ? `${status.latencyMs}ms` : "FALLA"}
          </span>
          {extra && (
            <span className="text-xs text-slate-600 text-right">{extra}</span>
          )}
        </div>

        {warning && (
          <p className="text-xs text-amber-700 font-semibold mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {warning}
          </p>
        )}

        {!ok && status.message && (
          <p className="text-xs text-red-700 mt-2 bg-red-100 border border-red-300 rounded px-2 py-1 font-mono break-all">
            {status.message}
          </p>
        )}

        {expanded && status.data && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">
              Detalles
            </p>
            <pre className="text-xs bg-white border border-slate-200 rounded p-2 overflow-x-auto">
              {JSON.stringify(status.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}