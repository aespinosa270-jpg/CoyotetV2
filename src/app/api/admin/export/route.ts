import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Validación de seguridad para nivel Black
    if (!session?.user?.email || session.user.role !== "black") {
      return new NextResponse("Acceso Denegado: Se requiere nivel Black", { status: 401 })
    }

    // Extracción de datos reales de Postgres
    const [allOrders, totalUsers] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } }
      }),
      prisma.user.count()
    ])

    const paidOrders = allOrders.filter(o => ['COMPLETED', 'PAID', 'DELIVERED'].includes(o.status))
    const globalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0)

    // Estructura de las hojas del Excel
    const kpiData = [
      { Metrica: "Capital Generado (MXN)", Valor: globalRevenue },
      { Metrica: "Socios Registrados", Valor: totalUsers },
      { Metrica: "Fecha de Reporte", Valor: new Date().toLocaleString('es-MX') }
    ]

    const transaccionesData = allOrders.map(order => ({
      "ID Pedido": order.id.slice(-10).toUpperCase(),
      "Cliente": order.customerName,
      "Email": order.customerEmail,
      "Fecha": new Date(order.createdAt).toLocaleDateString('es-MX'),
      "Estado": order.status,
      "Monto Total": order.total
    }))

    // Generación del Libro
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiData), "Resumen Ejecutivo")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transaccionesData), "Ledger de Ventas")

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Respuesta con cabeceras de descarga forzada
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Coyote_Textil_Reporte_${Date.now()}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: any) {
    console.error("Error en API de Excel:", error)
    return new NextResponse(`Fallo en el servidor: ${error.message}`, { status: 500 })
  }
}