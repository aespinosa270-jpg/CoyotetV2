// src/app/crm/admin/pedidos/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import OrderManager from "@/components/crm/OrderManager"

const ADMIN_EMAILS = [
  "jackrizk@coyotetextil.com",
  "stephanyrizk@coyotetextil.com",
];

export default async function AdminPedidosPage() {
  const session = await getServerSession(authOptions)
  
  // Seguridad: Solo los jefes entran aquí
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/crm/login")
  }

  // Traemos TODOS los pedidos, del más nuevo al más viejo
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      user: true // Para ver si son Gold, Elite, etc.
    }
  })

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <OrderManager initialOrders={orders} />
      </div>
    </div>
  )
}