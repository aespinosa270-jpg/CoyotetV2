/**
 * Repositorio de CLIENTES (compradores reales).
 * Agrupa las ordenes pagadas/entregadas por telefono del cliente y arma
 * un resumen: total gastado, # pedidos, telas favoritas, ultima compra.
 */
import { prisma } from "@/lib/prisma";

export interface ClienteResumen {
  phone: string;
  nombre: string;
  email: string | null;
  empresa: string | null;
  totalGastado: number;
  numPedidos: number;
  telasFavoritas: string[];
  ultimaCompra: string;       // ISO
  diasDesdeUltima: number;
  primeraCompra: string;      // ISO
  ticketPromedio: number;
}

export interface ClientesData {
  clientes: ClienteResumen[];
  kpis: {
    totalClientes: number;
    ticketPromedioCartera: number;
    ventasMes: number;
    mejorCliente: { nombre: string; total: number } | null;
  };
}

// Status que cuentan como "compra real"
const STATUS_COMPRA = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

function normalizePhone(p: string | null | undefined): string {
  if (!p) return "";
  let c = p.replace(/\D/g, "");
  if (c.startsWith("521") && c.length === 13) c = "52" + c.slice(3);
  return c;
}

export async function getClientesData(): Promise<ClientesData> {
  const orders = await prisma.order.findMany({
    where: { status: { in: STATUS_COMPRA as any } },
    orderBy: { createdAt: "desc" },
    select: {
      total: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      botPhone: true,
      createdAt: true,
      items: { select: { title: true, quantity: true } },
    },
  });

  // Agrupar por telefono normalizado
  const map = new Map<string, {
    phone: string; nombre: string; email: string | null;
    totalGastado: number; numPedidos: number;
    telaCount: Record<string, number>;
    fechas: Date[];
  }>();

  for (const o of orders) {
    const phone = normalizePhone(o.customerPhone || o.botPhone);
    if (!phone) continue;
    let e = map.get(phone);
    if (!e) {
      e = { phone, nombre: o.customerName || "(sin nombre)", email: o.customerEmail || null,
            totalGastado: 0, numPedidos: 0, telaCount: {}, fechas: [] };
      map.set(phone, e);
    }
    e.totalGastado += o.total || 0;
    e.numPedidos += 1;
    e.fechas.push(o.createdAt);
    for (const it of o.items) {
      e.telaCount[it.title] = (e.telaCount[it.title] || 0) + (it.quantity || 1);
    }
    // Usar el nombre mas reciente con contenido
    if (o.customerName && e.nombre === "(sin nombre)") e.nombre = o.customerName;
  }

  const now = Date.now();
  const clientes: ClienteResumen[] = Array.from(map.values()).map((e) => {
    const fechasOrden = e.fechas.sort((a, b) => b.getTime() - a.getTime());
    const ultima = fechasOrden[0];
    const primera = fechasOrden[fechasOrden.length - 1];
    const telasFavoritas = Object.entries(e.telaCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
    return {
      phone: e.phone,
      nombre: e.nombre,
      email: e.email,
      empresa: null,
      totalGastado: Math.round(e.totalGastado * 100) / 100,
      numPedidos: e.numPedidos,
      telasFavoritas,
      ultimaCompra: ultima.toISOString(),
      diasDesdeUltima: Math.floor((now - ultima.getTime()) / (1000 * 60 * 60 * 24)),
      primeraCompra: primera.toISOString(),
      ticketPromedio: Math.round((e.totalGastado / e.numPedidos) * 100) / 100,
    };
  }).sort((a, b) => b.totalGastado - a.totalGastado);

  // KPIs
  const totalClientes = clientes.length;
  const sumaTotal = clientes.reduce((s, c) => s + c.totalGastado, 0);
  const ticketPromedioCartera = totalClientes > 0
    ? Math.round((sumaTotal / clientes.reduce((s, c) => s + c.numPedidos, 0)) * 100) / 100 : 0;

  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const ventasMes = orders
    .filter((o) => o.createdAt >= inicioMes)
    .reduce((s, o) => s + (o.total || 0), 0);

  const mejorCliente = clientes.length > 0
    ? { nombre: clientes[0].nombre, total: clientes[0].totalGastado } : null;

  return {
    clientes,
    kpis: {
      totalClientes,
      ticketPromedioCartera,
      ventasMes: Math.round(ventasMes * 100) / 100,
      mejorCliente,
    },
  };
}
