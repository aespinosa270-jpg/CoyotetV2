import { getDealById } from "@/app/actions/deals";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, User, Package,
  Calendar, DollarSign, Tag, Palette,
  Hash, TrendingUp, CheckCircle2, XCircle,
} from "lucide-react";
import MoverDealButtons from "@/app/crm/admin/leads/_components/[id]/MoverDealButtons";
import DeleteDealButton from "@/app/crm/admin/leads/_components/DeleteDealButton";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(v);

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PROSPECTO:       { label: "Prospecto",    cls: "text-slate-400  border-slate-700  bg-slate-900/40"   },
  COTIZANDO:       { label: "Cotizando",    cls: "text-sky-400    border-sky-800    bg-sky-900/20"     },
  NEGOCIACION:     { label: "Negociación",  cls: "text-amber-400  border-amber-800  bg-amber-900/20"   },
  CERRADO_GANADO:  { label: "✓ Ganado",    cls: "text-emerald-400 border-emerald-800 bg-emerald-900/20" },
  CERRADO_PERDIDO: { label: "Perdido",      cls: "text-red-400    border-red-900    bg-red-950/40"     },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const deal = await getDealById(params.id);
  if (!deal) notFound();

  const status = STATUS_CONFIG[deal.status];
  const isClosed =
    deal.status === "CERRADO_GANADO" || deal.status === "CERRADO_PERDIDO";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* ── Breadcrumb + back ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/crm/admin/leads"
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={14} /> Pipeline
        </Link>
        <span className="text-[10px] text-zinc-700 font-mono">{deal.id}</span>
      </div>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="relative border border-zinc-800 bg-zinc-950 rounded-2xl overflow-hidden">
        {/* Fondo decorativo */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative p-8">
          {/* Status badge */}
          <div className="flex items-center justify-between mb-6">
            <span
              className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${status.cls}`}
            >
              {deal.status === "CERRADO_GANADO"  && <CheckCircle2 size={11} />}
              {deal.status === "CERRADO_PERDIDO" && <XCircle      size={11} />}
              {deal.status === "NEGOCIACION"     && <TrendingUp   size={11} />}
              {status.label}
            </span>
            <DeleteDealButton dealId={deal.id} />
          </div>

          {/* Título + empresa */}
          <h1 className="text-3xl font-[900] text-white tracking-tighter leading-tight mb-1">
            {deal.title}
          </h1>
          <p className="text-zinc-400 text-sm font-medium flex items-center gap-2">
            <Building2 size={14} className="text-zinc-600" />
            {deal.company}
          </p>

          {/* Valor prominente */}
          <div className="mt-6 inline-block">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Valor del Deal</p>
            <p className="text-5xl font-[900] text-[#FDCB02] tracking-tighter leading-none">
              {fmt(deal.value)}
            </p>
          </div>
        </div>

        {/* Barra de progreso del pipeline */}
        {!isClosed && (
          <div className="border-t border-zinc-800 px-8 py-4 flex items-center justify-between">
            {["PROSPECTO", "COTIZANDO", "NEGOCIACION"].map((s, i) => {
              const stages = ["PROSPECTO", "COTIZANDO", "NEGOCIACION"];
              const currentIdx = stages.indexOf(deal.status);
              const isDone    = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                      isCurrent ? "bg-[#FDCB02] shadow-[0_0_8px_#FDCB02]" :
                      isDone    ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      isCurrent ? "text-[#FDCB02]" :
                      isDone    ? "text-zinc-500"  : "text-zinc-700"
                    }`}
                  >
                    {s === "PROSPECTO" ? "Prospecto" : s === "COTIZANDO" ? "Cotizando" : "Negociación"}
                  </span>
                  {i < 2 && <div className={`flex-1 h-px mx-2 ${isDone ? "bg-emerald-800" : "bg-zinc-800"}`} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Acciones de pipeline ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Mover en Pipeline</p>
        <MoverDealButtons dealId={deal.id} currentStatus={deal.status} />
      </div>

      {/* ── Grid de datos ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Agente */}
        <InfoCard title="Agente Asignado" icon={User}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDCB02] text-black font-black text-sm flex items-center justify-center shrink-0">
              {deal.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{deal.employee.name}</p>
              <p className="text-zinc-500 text-xs">{deal.employee.email}</p>
            </div>
          </div>
        </InfoCard>

        {/* Fechas */}
        <InfoCard title="Fechas" icon={Calendar}>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-600 text-xs">Creado</span>
              <span className="text-zinc-300 text-xs font-mono">
                {new Date(deal.createdAt).toLocaleDateString("es-MX", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 text-xs">Última actualización</span>
              <span className="text-zinc-300 text-xs font-mono">
                {new Date(deal.updatedAt).toLocaleDateString("es-MX", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>
        </InfoCard>

        {/* Producto */}
        {deal.product && (
          <InfoCard title="Producto" icon={Package}>
            <div className="space-y-2">
              <p className="text-white font-bold">{deal.product.title}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Hash size={11} className="text-zinc-600" />
                  <span className="text-zinc-400 text-xs font-mono">{deal.product.sku}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tag size={11} className="text-zinc-600" />
                  <span className="text-zinc-400 text-xs uppercase">{deal.product.unit}</span>
                </div>
              </div>
              {(deal.quantity != null || deal.color) && (
                <div className="flex gap-3 mt-2 pt-2 border-t border-zinc-800">
                  {deal.quantity != null && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Cantidad</p>
                      <p className="text-sm font-bold text-white font-mono">
                        {deal.quantity} {deal.product.unit}
                      </p>
                    </div>
                  )}
                  {deal.color && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Color</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Palette size={12} className="text-zinc-500" />
                        <p className="text-sm font-bold text-white">{deal.color}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </InfoCard>
        )}

        {/* Cliente (si está vinculado) */}
        {deal.user && (
          <InfoCard title="Cliente Vinculado" icon={User}>
            <div className="space-y-1.5">
              <p className="text-white font-bold text-sm">{deal.user.name}</p>
              <p className="text-zinc-500 text-xs">{deal.user.email}</p>
              {deal.user.phone && (
                <p className="text-zinc-500 text-xs">{deal.user.phone}</p>
              )}
            </div>
          </InfoCard>
        )}

        {/* Resumen financiero */}
        <InfoCard title="Resumen Financiero" icon={DollarSign}>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  Valor estimado del Deal
                </p>
                <p className="text-xl font-[900] text-[#FDCB02] font-mono">
                  {fmt(deal.value)}
                </p>
              </div>
            </div>
          </div>
        </InfoCard>
      </div>

      <p className="text-[10px] text-zinc-700 text-center font-mono">
        Creado: {new Date(deal.createdAt).toLocaleString("es-MX")} ·{" "}
        Actualizado: {new Date(deal.updatedAt).toLocaleString("es-MX")}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-zinc-500" />
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}