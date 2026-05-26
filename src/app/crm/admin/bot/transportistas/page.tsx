import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import TransportistasClient from "./_components/TransportistasClient";

export const dynamic = "force-dynamic";

async function loadTransportistas() {
  return prisma.transportista.findMany({
    orderBy: [{ zona: "asc" }, { nombre: "asc" }],
  });
}

export default async function TransportistasPage() {
  const transportistas = await loadTransportistas();

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🚛</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Transportistas / Paqueterías
          </h1>
        </div>
        <p className="text-sm text-neutral-600 max-w-3xl">
          Paqueterías de ruta agrupadas por zona de CDMX. El bot las menciona como
          opción <strong>adicional</strong> a Skydropx cuando el cliente busca alternativas más
          baratas. Edita activos/inactivos según convenga.
        </p>
      </header>

      <Suspense fallback={<div className="p-8 text-center text-neutral-500">Cargando…</div>}>
        <TransportistasClient initialTransportistas={transportistas} />
      </Suspense>
    </div>
  );
}