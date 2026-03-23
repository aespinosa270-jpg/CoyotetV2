import { prisma } from "@/lib/prisma";
import CotizadorClient from "./_components/CotizadorClient";

export const dynamic = 'force-dynamic';

export default async function NuevaCotizacionPage() {
  // Traemos clientes y productos en paralelo para no hacer esperar al servidor
  const [rawClientes, productos] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, company: true, rfc: true, email: true }
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, sku: true, priceMayoreo: true }
    })
  ]);

  // Serializamos los clientes para garantizar que 'name' siempre sea un string
  // Esto evita el error de TypeScript ts(2322)
  const clientes = rawClientes.map(cliente => ({
    id: cliente.id,
    name: cliente.name || 'Sin Nombre',
    company: cliente.company,
    rfc: cliente.rfc,
    email: cliente.email
  }));

  return (
    <div className="h-full bg-[#050505] min-h-screen text-white font-sans p-8">
      <CotizadorClient clientes={clientes} productos={productos} />
    </div>
  );
}