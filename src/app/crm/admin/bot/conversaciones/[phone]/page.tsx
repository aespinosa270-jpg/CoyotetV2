/**
 * Detalle de una conversación específica.
 *
 * Layout de 2 columnas:
 *   IZQUIERDA: perfil + memoria episódica + objeciones + tácticas
 *   DERECHA:   resumen semántico + timeline de mensajes
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getConversacionDetallada } from "@/lib/bot/repositories/admin-queries";
import { getMediaList, type MediaMensaje } from "@/lib/bot/repositories/media-repo";
import MediaMessage from "./_components/MediaMessage";
import {
  getPauseState,
  getPauseTTL,
  isBotPaused,
} from "@/lib/bot/repositories/pause-repo";
import TakeOverPanel from "./_components/TakeOverPanel";
import LlamarButton from "../../_components/LlamarButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ phone: string }>;
}

export default async function ConversacionDetallePage({ params }: Props) {
  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  const [detalle, mediaList, paused, pauseState, ttlSeconds] = await Promise.all([
    getConversacionDetallada(phone),
    getMediaList(phone),
    isBotPaused(phone),
    getPauseState(phone),
    getPauseTTL(phone),
  ]);
  if (!detalle) notFound();

  const { perfil, historial, resumen, memoria, pedidos, topObjeciones } =
    detalle;

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-start gap-4">
        <div>
          <Link
            href="/crm/admin/bot/conversaciones"
            className="text-xs text-blue-600 hover:underline"
          >
            ← Volver a conversaciones
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {perfil.nombre || "(sin nombre)"}
          </h1>
          <p className="text-sm text-slate-500">
            <code>{perfil.telefono}</code> · {perfil.segmento || "prospecto"} ·{" "}
            {perfil.totalCompras} compra{perfil.totalCompras !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="pt-1">
          <LlamarButton phone={phone} variant="primary" size="md" label="Llamar ahora" />
        </div>
      </header>

      {/* FEATURE 3: Panel de control humano */}
      <TakeOverPanel
        phone={phone}
        initialPaused={paused}
        initialState={pauseState}
        initialTTLSeconds={ttlSeconds}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Columna izquierda: perfil + memoria + objeciones ── */}
        <aside className="space-y-4 lg:col-span-1">
          <Section title="Perfil">
            <DL label="Nombre" value={perfil.nombre} />
            <DL label="Segmento" value={perfil.segmento} />
            <DL label="Total compras" value={String(perfil.totalCompras ?? 0)} />
            <DL
              label="Monto acumulado"
              value={`$${(perfil.montoAcumulado ?? 0).toLocaleString("es-MX")}`}
            />
            <DL
              label="Primer contacto"
              value={fmt(perfil.primerContacto)}
            />
            <DL label="Último contacto" value={fmt(perfil.ultimoContacto)} />
            {perfil.direccionEnvio && (
              <DL label="Dirección envío" value={perfil.direccionEnvio} />
            )}
            {(perfil as any).codigoPostalEnvio && (
              <DL
                label="CP envío"
                value={(perfil as any).codigoPostalEnvio}
              />
            )}
            {perfil.cpFiscal && <DL label="CP fiscal" value={perfil.cpFiscal} />}
          </Section>

          <Section title="Scoring del bot">
            <DLBar
              label="Temperatura compra"
              value={perfil.temperaturaCompra ?? 30}
              max={100}
              color={
                (perfil.temperaturaCompra ?? 0) >= 70 ? "red" : "orange"
              }
            />
            <DLBar
              label="Nivel confianza"
              value={perfil.nivelConfianza ?? 40}
              max={100}
              color={(perfil.nivelConfianza ?? 0) >= 60 ? "green" : "slate"}
            />
            <DL label="Táctica activa" value={perfil.tacticaActual ?? "—"} />
          </Section>

          {topObjeciones.length > 0 && (
            <Section title="Objeciones detectadas">
              {topObjeciones.map((o, i) => (
                <div
                  key={i}
                  className="flex justify-between py-1 border-b border-slate-100 last:border-0"
                >
                  <span className="text-sm text-slate-700">{o.label}</span>
                  <span className="text-xs text-orange-600 font-medium">
                    {o.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </Section>
          )}

          {memoria && memoria.hechos && memoria.hechos.length > 0 && (
            <Section title="Memoria episódica">
              <p className="text-xs text-slate-400 mb-2">
                Hechos que el bot recuerda entre conversaciones
              </p>
              <ul className="space-y-1.5">
                {memoria.hechos
                  .sort((a, b) => b.confianza - a.confianza)
                  .slice(0, 10)
                  .map((h, i) => (
                    <li key={i} className="text-xs">
                      <span className="text-slate-400">[{h.categoria}]</span>{" "}
                      <span className="text-slate-700">{h.hecho}</span>
                      <span className="text-slate-400 ml-1">
                        ({Math.round(h.confianza * 100)}%)
                      </span>
                    </li>
                  ))}
              </ul>
            </Section>
          )}

          {pedidos.length > 0 && (
            <Section title={`Pedidos (${pedidos.length})`}>
              <ul className="space-y-2 text-xs">
                {pedidos.slice(0, 5).map((p: any, i) => (
                  <li
                    key={i}
                    className="border border-slate-100 rounded p-2 text-slate-700"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        ${(p.total ?? 0).toLocaleString("es-MX")}
                      </span>
                      <span className="text-slate-400">{fmt(p.fecha)}</span>
                    </div>
                    {p.metodo && (
                      <div className="text-slate-500 mt-0.5">{p.metodo}</div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>

        {/* ── Columna derecha: resumen + timeline ── */}
        <main className="space-y-4 lg:col-span-2">
          {resumen && (
            <Section title="Resumen semántico de la conversación">
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {resumen}
              </p>
            </Section>
          )}

          <Section title={`Historial (${historial.length} mensajes)`}>
            {historial.length === 0 ? (
              <p className="text-sm text-slate-500">Sin mensajes guardados.</p>
            ) : (
              <div className="space-y-2 max-h-[700px] overflow-y-auto">
                {historial.map((m, i) => (
                  <MessageBubble key={i} mensaje={m} mediaList={mediaList} />
                ))}
              </div>
            )}
          </Section>
        </main>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-md p-4">
      <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function DL({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-900 text-right max-w-[60%] truncate">
        {value || "—"}
      </span>
    </div>
  );
}

function DLBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: "red" | "orange" | "green" | "slate";
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const bgClass = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    green: "bg-emerald-500",
    slate: "bg-slate-400",
  }[color];

  return (
    <div className="py-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-700 font-medium">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
        <div
          className={`h-full ${bgClass} rounded`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MessageBubble({
  mensaje,
  mediaList = [],
}: {
  mensaje: any;
  mediaList?: MediaMensaje[];
}) {
  const isUser = mensaje.role === "user";
  const isTool = mensaje.role === "tool";
  const isAssistant = mensaje.role === "assistant";

  if (isTool) {
    return (
      <div className="text-xs text-slate-400 bg-slate-50 rounded p-2 font-mono">
        🔧 tool: {mensaje.content?.slice(0, 200)}
      </div>
    );
  }

  // FASE 12-fix #2: buscar media asociada por timestamp (±5 seg)
  const media =
    isUser && mensaje.timestamp
      ? mediaList.find((m) => {
          const msgTs = new Date(mensaje.timestamp).getTime();
          const mediaTs = new Date(m.timestamp).getTime();
          return Math.abs(msgTs - mediaTs) < 5000;
        })
      : undefined;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-slate-100 text-slate-900 border border-slate-200"
        }`}
      >
        {isAssistant && (
          <div className="text-xs text-slate-500 mb-0.5">🐺 El Coyote</div>
        )}
        <div className="text-sm whitespace-pre-line">{mensaje.content}</div>
        {media && (
          <div className="mt-2">
            <MediaMessage
              mediaId={media.nativeId}
              tipo={media.tipo}
              caption={media.caption}
              mimeType={media.mimeType}
              vision={media.vision}
              transcripcion={media.transcripcion}
            />
          </div>
        )}
        {mensaje.timestamp && (
          <div
            className={`text-xs mt-1 ${isUser ? "text-blue-100" : "text-slate-400"}`}
          >
            {fmt(mensaje.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(iso?: string): string {
  if (!iso || iso === "1970-01-01T00:00:00.000Z") return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
