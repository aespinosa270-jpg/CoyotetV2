"use client";

import { useEffect, useState } from "react";
import { AsyncButton } from "./AsyncButton";

interface ServiceStatus {
  ok: boolean;
  latencyMs?: number;
  message?: string;
  data?: Record<string, unknown>;
}

interface HealthResponse {
  redis: ServiceStatus;
  supabase: ServiceStatus;
  openai: ServiceStatus;
  timestamp: string;
}

export function HealthDashboardClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Para la herramienta de "limpiar memoria de un cliente"
  const [clearPhone, setClearPhone] = useState("");

  async function fetchHealth() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bot/health");
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      setHealth(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-4">
      {/* Status grid */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Conectividad de servicios
          </h2>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? "Verificando..." : "↻ Re-verificar"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-3">Error: {error}</p>
        )}

        {health && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ServiceCard name="Redis (Upstash)" status={health.redis} />
            <ServiceCard
              name="Supabase pgvector"
              status={health.supabase}
              extra={
                health.supabase.data?.embeddingsCount !== undefined ? (
                  <span>
                    {String(health.supabase.data.embeddingsCount)} embeddings
                  </span>
                ) : null
              }
            />
            <ServiceCard
              name="OpenAI"
              status={health.openai}
              extra={
                health.openai.data?.modelsAvailable !== undefined ? (
                  <span>
                    {String(health.openai.data.modelsAvailable)} modelos
                  </span>
                ) : null
              }
            />
          </div>
        )}

        {health && (
          <p className="text-xs text-slate-400 mt-3">
            Última verificación: {new Date(health.timestamp).toLocaleTimeString("es-MX")}
          </p>
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
            <div className="flex gap-2 items-start">
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
                label="Limpiar"
                confirmMessage={`Esto borrará la memoria, objeciones y resumen de ${clearPhone || "ese cliente"}. ¿Continuar?`}
                variant="danger"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function ServiceCard({
  name,
  status,
  extra,
}: {
  name: string;
  status: ServiceStatus;
  extra?: React.ReactNode;
}) {
  const dotColor = status.ok ? "bg-emerald-500" : "bg-red-500";
  const borderColor = status.ok ? "border-emerald-200" : "border-red-200";
  const bgColor = status.ok ? "bg-emerald-50" : "bg-red-50";

  return (
    <div className={`border rounded p-3 ${borderColor} ${bgColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <p className="text-sm font-medium text-slate-900">{name}</p>
      </div>
      <p className="text-xs text-slate-600">
        {status.ok ? (
          <>OK · {status.latencyMs}ms</>
        ) : (
          <span className="text-red-700">{status.message ?? "error"}</span>
        )}
      </p>
      {extra && <p className="text-xs text-slate-500 mt-1">{extra}</p>}
    </div>
  );
}
