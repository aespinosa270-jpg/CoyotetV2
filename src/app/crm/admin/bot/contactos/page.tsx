/**
 * Página: Contactos Outbound
 *
 * Permite al admin agregar números manualmente y dispararles la plantilla
 * `bienvenida` para iniciar conversación. Una vez el cliente responde,
 * el bot v2 lo atiende automáticamente.
 */
import { prisma } from "@/lib/prisma";
import ContactosForm from "./_components/ContactosForm";
import ContactosTable from "./_components/ContactosTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContactosPage() {
  const contactos = await prisma.contactoOutbound.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const stats = {
    total: contactos.length,
    plantillasEnviadas: contactos.filter((c) => c.plantillaEnviada).length,
    respondieron: contactos.filter((c) => c.clienteRespondio).length,
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Bot v2 — Captación
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          CONTACTOS <span className="text-[#FDCB02]">OUTBOUND</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Agrega números manualmente, dispara plantilla y el bot v2 se encarga
          cuando respondan.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <p className="text-xs uppercase text-slate-500">Total contactos</p>
          <p className="text-2xl font-black">{stats.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <p className="text-xs uppercase text-slate-500">
            Plantillas enviadas
          </p>
          <p className="text-2xl font-black">{stats.plantillasEnviadas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <p className="text-xs uppercase text-slate-500">Respondieron</p>
          <p className="text-2xl font-black">
            {stats.respondieron}
            <span className="text-sm text-slate-400 ml-1">
              (
              {stats.plantillasEnviadas > 0
                ? Math.round(
                    (stats.respondieron / stats.plantillasEnviadas) * 100
                  )
                : 0}
              %)
            </span>
          </p>
        </div>
      </div>

      {/* Form para agregar */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-lg font-semibold mb-3">Agregar contacto</h2>
        <ContactosForm />
      </section>

      {/* Tabla */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Contactos</h2>
        <ContactosTable contactos={contactos} />
      </section>
    </div>
  );
}
