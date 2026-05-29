/**
 * Detalle de una conversación específica (rediseño CRM pro).
 *
 * Layout: header con estado + sidebar de perfil + chat estilo inbox.
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

  const inicial = (perfil.nombre || "?").charAt(0).toUpperCase();

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* ── Header ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
        <Link
          href="/crm/admin/bot/conversaciones"
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Volver a conversaciones
        </Link>
        <div className="flex items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow">
              {inicial}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {perfil.nombre || "(sin nombre)"}
              </h1>
              <p className="text-sm text-slate-500">
                <code className="text-slate-600">{perfil.telefono}</code>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="capitalize">{perfil.segmento || "prospecto"}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                {perfil.totalCompras} compra{perfil.totalCompras !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <LlamarButton phone={phone} variant="primary" size="md" label="Llamar ahora" />
        </div>
      </div>

      {/* ── Panel de control humano ── */}
      <TakeOverPanel
        phone={phone}
        initialPaused={paused}
        initialState={pauseState}
        initialTTLSeconds={ttlSeconds}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Sidebar: perfil ── */}
        <aside className="space-y-4 lg:col-span-1">
          <Section title="Perfil">
            <DL label="Nombre" value={perfil.nombre} />
            <DL label="Segmento" value={perfil.segmento} />
            <DL label="Total compras" value={String(perfil.totalCompras ?? 0)} />
            <DL
              label="Monto acumulado"
              value={`$${(perfil.montoAcumulado ?? 0).toLocaleString("es-MX")}`}
            />
            <DL label="Primer contacto" value={fmt(perfil.primerContacto)} />
            <DL label="Último contacto" value={fmt(perfil.ultimoContacto)} />
            {perfil.direccionEnvio && (
              <DL label="Dirección envío" value={perfil.direccionEnvio} />
            )}
            {(perfil as any).codigoPostalEnvio && (
              <DL label="CP envío" value={(perfil as any).codigoPostalEnvio} />
            )}
            {perfil.cpFiscal && <DL label="CP fiscal" value={perfil.cpFiscal} />}
          </Section>

          <Section title="Scoring del bot">
            <DLBar
              label="Temperatura compra"
              value={perfil.temperaturaCompra ?? 30}
              max={100}
              color={(perfil.temperaturaCompra ?? 0) >= 70 ? "red" : "orange"}
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
                {pedidos.slice(0, 5).map((p: any, i: number) => (
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

        {/* ── Chat principal ── */}
        <main className="space-y-4 lg:col-span-2">
          {resumen && (
            <Section title="Resumen de la conversación">
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {resumen}
              </p>
            </Section>
          )}

          <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                💬 Conversación
              </h2>
              <span className="text-xs text-slate-400">
                {historial.length} mensaje{historial.length !== 1 ? "s" : ""}
              </span>
            </div>
            {historial.length === 0 ? (
              <p className="text-sm text-slate-500 p-6 text-center">
                Sin mensajes guardados.
              </p>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto p-4 bg-slate-50/50">
                {historial.map((m, i) => (
                  <MessageBubble key={i} mensaje={m} mediaList={mediaList} />
                ))}
                <OrphanMediaBlock historial={historial} mediaList={mediaList} />
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

// ─── Componentes ───

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function DL({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-900 text-right max-w-[60%] truncate font-medium">
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
    <div className="py-1.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-700 font-medium">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgClass} rounded-full transition-all`}
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
      <div className="text-xs text-slate-400 bg-slate-100 rounded p-2 font-mono max-w-[70%] mx-auto">
        🔧 {mensaje.content?.slice(0, 200)}
      </div>
    );
  }

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
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {isAssistant && (
          <div className="text-[11px] text-slate-400 mb-1 ml-1 font-medium">
            🐺 El Coyote
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
          }`}
        >
          <div className="text-sm whitespace-pre-line leading-relaxed">
            {mensaje.content}
          </div>
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
        </div>
        {mensaje.timestamp && (
          <div className="text-[10px] mt-1 mx-1 text-slate-400">
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

// ─── Media huérfana (sin matcheo con historial) ───
function OrphanMediaBlock({
  historial,
  mediaList,
}: {
  historial: any[];
  mediaList: MediaMensaje[];
}) {
  if (!mediaList || mediaList.length === 0) return null;

  const matched = new Set<string>();
  historial.forEach((m) => {
    if (m.role !== "user" || !m.timestamp) return;
    const msgTs = new Date(m.timestamp).getTime();
    mediaList.forEach((media) => {
      const mediaTs = new Date(media.timestamp).getTime();
      if (Math.abs(msgTs - mediaTs) < 5000) {
        matched.add(media.messageId);
      }
    });
  });

  const orphans = mediaList.filter((m) => !matched.has(m.messageId));
  if (orphans.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t-2 border-dashed border-amber-200">
      <p className="text-xs uppercase font-bold text-amber-700 mb-2 flex items-center gap-1">
        📎 Archivos del cliente
      </p>
      <div className="space-y-3">
        {orphans.map((media) => (
          <div key={media.messageId} className="flex justify-end">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] shadow-sm">
              <p className="text-[10px] text-slate-400 mb-1">
                {new Date(media.timestamp).toLocaleString("es-MX")}
              </p>
              <MediaMessage
                mediaId={media.nativeId}
                tipo={media.tipo}
                caption={media.caption}
                mimeType={media.mimeType}
                vision={media.vision}
                transcripcion={media.transcripcion}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
