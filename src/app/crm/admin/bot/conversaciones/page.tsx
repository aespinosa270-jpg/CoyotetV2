/**
 * Lista paginada de conversaciones del bot.
 * Filtros: por segmento (query param ?segmento=vip).
 * Paginación: ?offset=50&limit=50
 */
import Link from "next/link";
import { listConversaciones } from "@/lib/bot/repositories/admin-queries";
import LeadFilterBar from "./_components/LeadFilterBar";
import { ConversacionesTable } from "../_components/ConversacionesTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    segmento?: string;
    lead?: string;
    offset?: string;
    limit?: string;
  }>;
}

const SEGMENTOS = ["vip", "recurrente", "nuevo", "prospecto", "inactivo"];

export default async function ConversacionesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const offset = Number(params.offset ?? 0);
  const limit = Number(params.limit ?? 50);
  const segmento = params.segmento;
  const lead = params.lead;

  let { items, total } = await listConversaciones({
    offset,
    limit: lead ? 10000 : limit, // si hay filtro de lead, traer todos primero
    segmentoFilter: segmento,
  });

  // FASE B: filtro adicional por leadScore en memoria
  if (lead) {
    const filtered = items.filter((i) => i.leadScore === lead);
    total = filtered.length;
    items = filtered.slice(offset, offset + limit);
  }

  // KPIs por lead score (sobre todos los items cargados)
  const leadKpis: Record<string, number> = {};
  for (const it of items) {
    if (it.leadScore) {
      leadKpis[it.leadScore] = (leadKpis[it.leadScore] ?? 0) + 1;
    }
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conversaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} {total === 1 ? "cliente" : "clientes"}
            {segmento && ` filtrados por segmento "${segmento}"`}
          </p>
        </div>
        <div className="flex gap-2 items-center text-xs text-slate-500">
          Pág. {currentPage} de {Math.max(1, totalPages)}
        </div>
      </header>

      {/* Filtros de segmento */}
      <div className="flex gap-1 flex-wrap">
        <FiltroLink
          label="Todos"
          href="/crm/admin/bot/conversaciones"
          active={!segmento}
        />
        {SEGMENTOS.map((s) => (
          <FiltroLink
            key={s}
            label={s}
            href={`/crm/admin/bot/conversaciones?segmento=${s}`}
            active={segmento === s}
          />
        ))}
      </div>

      {/* FASE B: filtros por lead score */}
      <LeadFilterBar activeLead={lead} leadKpis={leadKpis} />

      <ConversacionesTable items={items} />

      {/* Paginación */}
      {totalPages > 1 && (
        <nav className="flex justify-center gap-2 pt-4">
          {currentPage > 1 && (
            <PaginationLink
              href={buildHref({
                segmento,
                offset: Math.max(0, offset - limit),
                limit,
              })}
              label="← Anterior"
            />
          )}
          {currentPage < totalPages && (
            <PaginationLink
              href={buildHref({
                segmento,
                offset: offset + limit,
                limit,
              })}
              label="Siguiente →"
            />
          )}
        </nav>
      )}
    </div>
  );
}

function FiltroLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full capitalize ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

function PaginationLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm px-4 py-2 border border-slate-200 rounded hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function buildHref(params: {
  segmento?: string;
  offset?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.segmento) sp.set("segmento", params.segmento);
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  return `/crm/admin/bot/conversaciones?${sp.toString()}`;
}
