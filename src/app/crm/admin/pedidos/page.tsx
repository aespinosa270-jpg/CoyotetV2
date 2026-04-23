// src/app/crm/admin/pedidos/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminOrdersClient from "./_components/AdminOrdersClient";

const ADMIN_EMAILS = [
  "jackrizk@coyotetextil.com",
  "stephanyrizk@coyotetextil.com",
];

export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const session = await auth();
  
  // Seguridad: Solo los jefes entran aquí
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/crm/login");
  }

  // 🔥 AQUÍ ESTÁ EL FILTRO: Solo traemos las que ya están pagadas, en proceso, enviadas o entregadas
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] // Ignoramos PENDING, CANCELLED o FAILED
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      user: { select: { name: true, email: true, membershipTier: true } } // Mantenemos la data de membresía
    }
  });

  // Calculamos el total para el header (ahora solo suma dinero que SÍ entró)
  const ventasTotales = orders.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto">
      
      {/* ─── HEADER COYOTE ADMIN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-1">
            Gestión de Ventas Web
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic flex items-center gap-2">
            <span className="text-black">ÓRDENES</span>
            <span className="text-[#FDCB02]">PAGADAS</span>
          </h1>
        </div>
        
        <div className="bg-black text-[#FDCB02] px-6 py-3 rounded-2xl shadow-lg flex flex-col items-end">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Ingresos Reales</p>
          <p className="text-xl font-black font-mono">
            ${ventasTotales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ─── COMPONENTE CLIENTE ─── */}
      {/* Usamos JSON.parse(JSON.stringify) para pasar las fechas de Prisma sin romper Next.js */}
      <AdminOrdersClient initialOrders={JSON.parse(JSON.stringify(orders))} />
      
    </div>
  );
}