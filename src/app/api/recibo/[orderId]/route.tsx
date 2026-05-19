/**
 * GET /api/recibo/[orderId]
 * Genera imagen PNG con ticket de compra Coyote Textil.
 */
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  const { orderId } = await context.params;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    include: { items: true },
  });

  if (!order) {
    return new Response("Orden no encontrada", { status: 404 });
  }

  const fechaFmt = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date());

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(n);

  const subtotal = order.subtotal || 0;
  const envio = order.freightCost || order.shippingCost || 0;
  const iva = order.taxIVA || 0;
  const total = order.total || 0;

  const statusLabel =
    order.status === "PAID" ? "✅ PAGADO" :
    order.status === "PENDING" ? "⏳ PENDIENTE" :
    order.status === "DELIVERED" ? "📦 ENTREGADO" :
    order.status === "CANCELLED" ? "❌ CANCELADO" :
    order.status;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#0a0a0a", color: "#ffffff", fontFamily: "system-ui, sans-serif", padding: "40px 50px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "20px", borderBottom: "3px solid #FDCB02" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: "#FDCB02", letterSpacing: "-1px" }}>COYOTE</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", marginTop: "-8px" }}>TEXTIL</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 14, color: "#a0a0a0" }}>TICKET</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#FDCB02", marginTop: "4px" }}>#{order.orderNumber.slice(0, 14).toUpperCase()}</span>
            <span style={{ fontSize: 12, color: "#a0a0a0", marginTop: "4px" }}>{fechaFmt}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "24px", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: 12, color: "#FDCB02", fontWeight: 700, width: "80px" }}>CLIENTE</span>
            <span style={{ fontSize: 16, color: "#ffffff" }}>{order.customerName}</span>
          </div>
          {order.customerEmail ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: 12, color: "#FDCB02", fontWeight: 700, width: "80px" }}>EMAIL</span>
              <span style={{ fontSize: 14, color: "#a0a0a0" }}>{order.customerEmail}</span>
            </div>
          ) : null}
          {order.customerPhone ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: 12, color: "#FDCB02", fontWeight: 700, width: "80px" }}>TEL</span>
              <span style={{ fontSize: 14, color: "#a0a0a0" }}>{order.customerPhone}</span>
            </div>
          ) : null}
          {order.address ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ fontSize: 12, color: "#FDCB02", fontWeight: 700, width: "80px" }}>ENVÍO</span>
              <span style={{ fontSize: 13, color: "#a0a0a0", maxWidth: "550px" }}>{order.address}</span>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #2a2a2a", gap: "10px" }}>
          <span style={{ fontSize: 14, color: "#FDCB02", fontWeight: 700, marginBottom: "8px" }}>DETALLE DEL PEDIDO</span>
          {order.items.slice(0, 6).map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: 15, color: "#ffffff", fontWeight: 600 }}>{item.title}{item.color ? ` · ${item.color}` : ""}</span>
                <span style={{ fontSize: 12, color: "#888888", marginTop: "2px" }}>{item.quantity} {item.unit || "u"} × {formatMoney(item.price)}</span>
              </div>
              <span style={{ fontSize: 16, color: "#ffffff", fontWeight: 700 }}>{formatMoney(item.quantity * item.price)}</span>
            </div>
          ))}
          {order.items.length > 6 ? (
            <span style={{ fontSize: 12, color: "#888888", fontStyle: "italic" }}>...y {order.items.length - 6} producto(s) más</span>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #2a2a2a", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#a0a0a0" }}>Subtotal</span>
            <span style={{ fontSize: 14, color: "#ffffff" }}>{formatMoney(subtotal)}</span>
          </div>
          {envio > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#a0a0a0" }}>Envío</span>
              <span style={{ fontSize: 14, color: "#ffffff" }}>{formatMoney(envio)}</span>
            </div>
          ) : null}
          {iva > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#a0a0a0" }}>IVA 16%</span>
              <span style={{ fontSize: 14, color: "#ffffff" }}>{formatMoney(iva)}</span>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "10px", borderTop: "2px solid #FDCB02" }}>
            <span style={{ fontSize: 22, color: "#FDCB02", fontWeight: 900 }}>TOTAL</span>
            <span style={{ fontSize: 32, color: "#FDCB02", fontWeight: 900 }}>{formatMoney(total)}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "#888888" }}>Estado:</span>
            <span style={{ fontSize: 14, color: "#ffffff", fontWeight: 700, marginTop: "2px" }}>{statusLabel}</span>
            <span style={{ fontSize: 11, color: "#888888", marginTop: "8px" }}>Pago: {order.paymentMethod === "card" ? "Tarjeta" : order.paymentMethod === "spei" ? "SPEI" : order.paymentMethod}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, color: "#888888" }}>Rastreo:</span>
            <span style={{ fontSize: 13, color: "#FDCB02", marginTop: "2px" }}>coyotetextil.com/rastreo</span>
            <span style={{ fontSize: 18, color: "#FDCB02", marginTop: "8px", fontWeight: 700 }}>🐺 Gracias por su preferencia</span>
          </div>
        </div>
      </div>
    ),
    { width: 800, height: 1100 }
  );
}