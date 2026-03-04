import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const [tickets, clientes, deals, productos] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        OR: [
          { subject:     { contains: q, mode: "insensitive" } },
          { ticketNumber:{ contains: q, mode: "insensitive" } },
        ],
        status: { not: "CERRADO" },
      },
      select: { id: true, ticketNumber: true, subject: true, status: true },
      take: 4,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 4,
    }),
    prisma.deal.findMany({
      where: {
        OR: [
          { title:   { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
        status: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] },
      },
      select: { id: true, title: true, company: true, status: true },
      take: 4,
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { sku:   { contains: q, mode: "insensitive" } },
        ],
        isActive: true,
      },
      select: { id: true, title: true, sku: true },
      take: 3,
    }),
  ]);

  const results = [
    ...tickets.map((t) => ({
      id:    t.id,
      label: t.subject,
      sub:   `${t.ticketNumber} · ${t.status}`,
      href:  `/crm/admin/tickets/abiertos`,
      type:  "ticket" as const,
    })),
    ...clientes.map((c) => ({
      id:    c.id,
      label: c.name ?? c.email,
      sub:   c.email,
      href:  `/crm/admin/clientes/${c.id}`,
      type:  "cliente" as const,
    })),
    ...deals.map((d) => ({
      id:    d.id,
      label: d.title,
      sub:   d.company,
      href:  `/crm/admin/leads/${d.id}`,
      type:  "deal" as const,
    })),
    ...productos.map((p) => ({
      id:    p.id,
      label: p.title,
      sub:   p.sku,
      href:  `/crm/admin/productos`,
      type:  "producto" as const,
    })),
  ];

  return NextResponse.json(results);
}
```

---

Estructura:
```
src/app/crm/admin/
  layout.tsx                          ← Server — carga sesión, employee, notifCount
  _components/
    AdminLayoutClient.tsx             ← "use client" — sidebar, navbar, búsqueda
    LogoutButton.tsx                  ← (ya existente, puede eliminarse)
  
src/app/api/admin/search/
  route.ts                            ← GET ?q= — busca tickets, clientes, deals, productos