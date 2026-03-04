import { getDealById } from "@/app/actions/deals";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Package, Tag, Hash } from "lucide-react";
import MoverDealButtons from "@/app/crm/admin/leads/_components/[id]/MoverDealButtons";

const STATUS_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto", COTIZANDO: "Cotizando",
  NEGOCIACION: "Negociación", CERRADO_GANADO: "✓ Ganado", CERRADO_PERDIDO: "Perdido",
};
const STATUS_COLOR: Record<string, string> = {
  PROSPECTO: "text-zinc-400 border-zinc-700",
  COTIZANDO: "text-sky-400 border-sky-700",
  NEGOCIACION: "text-amber-400 border-amber-700",
  CERRADO_GANADO: "text-emerald-400 border-emerald-700",
  CERRADO_PERDIDO: "text-red-400 border-red-700",
};

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const deal = await getDealById(params.id);
  if (!deal) notFound();

  const sc = STATUS_COLOR[deal.status] ?? "text-zinc-400 border-zinc-700";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/crm/admin/leads"
        className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-widest font-bold">
        <ArrowLeft size={14} /> Volver al Pipeline
      </Link>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{deal.company}</p>
            <h1 className="text-2xl font-[900] uppercase tracking-tighter text-white">{deal.title}</h1>
          </div>
          <span className={`px-3 py-1 border rounded-full text-[10px] font-[900] uppercase tracking-widest ${sc}`}>
            {STATUS_LABEL[deal.status]}
          </span>
        </div>

        <p className="text-3xl font-[900] text-[#FDCB02]">
          ${deal.value.toLocaleString("es-MX")} <span className="text-sm text-zinc-500 font-normal">MXN</span>
        </p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: User,     label: "Agente",   value: deal.employee.name  },
          { icon: Building2,label: "Empresa",  value: deal.company        },
          { icon: Package,  label: "Producto", value: deal.product?.title ?? "—" },
          { icon: Hash,     label: "SKU",      value: deal.product?.sku   ?? "—" },
          { icon: Tag,      label: "Color",    value: deal.color           ?? "—" },
          { icon: Tag,      label: "Cantidad", value: deal.quantity != null ? `${deal.quantity} ${deal.product?.unit ?? ""}` : "—" },
        ].map((row) => (
          <div key={row.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <row.icon size={12} className="text-zinc-500" />
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{row.label}</p>
            </div>
            <p className="text-sm font-bold text-white">{row.value}</p>
          </div>
        ))}
      </div>

      {/* Mover en pipeline */}
      <MoverDealButtons dealId={deal.id} currentStatus={deal.status} />

      {/* Timestamps */}
      <p className="text-[10px] text-zinc-700 text-center font-mono">
        Creado: {new Date(deal.createdAt).toLocaleString("es-MX")} ·
        Actualizado: {new Date(deal.updatedAt).toLocaleString("es-MX")}
      </p>
    </div>
  );
}