import type { BotContext } from "../../core/types";
import { prisma } from "@/lib/prisma";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "tool-consultar-estado-pedido" });

// Traduce el status interno a lenguaje de cliente + instruccion para el bot
const STATUS_CLIENTE: Record<string, { estado: string; instruccion: string }> = {
  PENDING: {
    estado: "pendiente de pago",
    instruccion: "El pedido aun no registra el pago. Pregunta amablemente si ya realizo la transferencia SPEI; si dice que si, pide el comprobante.",
  },
  PAID: {
    estado: "pagado, en preparacion",
    instruccion: "El pago esta confirmado y el pedido esta en preparacion. Dile que se esta preparando y que se coloca en paqueteria en 1 a 2 dias habiles. NO prometas fecha exacta de entrega.",
  },
  PROCESSING: {
    estado: "en preparacion",
    instruccion: "El pedido se esta preparando en almacen. Dile que esta en proceso y que sale a paqueteria en 1 a 2 dias habiles. NO prometas fecha exacta de entrega.",
  },
  SHIPPED: {
    estado: "enviado / en camino",
    instruccion: "El pedido YA SALIO y va en camino. Diselo con entusiasmo. Si hay numero de guia, compartelo para que rastree. NO inventes fecha de llegada (depende de la paqueteria).",
  },
  DELIVERED: {
    estado: "entregado",
    instruccion: "El pedido figura como ENTREGADO. Confirmalo y pregunta amablemente si todo llego bien. Es buen momento para ofrecer recompra si aplica.",
  },
  CANCELLED: {
    estado: "cancelado",
    instruccion: "El pedido figura como cancelado. Pregunta si desea retomarlo o hacer uno nuevo.",
  },
};

export async function consultarEstadoPedidoHandler(_args: any, context: BotContext) {
  const phone = context.profile?.telefono ?? "";
  log.info({ phone }, "Consultando estado de pedido");

  if (!phone || phone.startsWith("web:")) {
    return {
      success: false,
      instruccion_para_ia: "No se pudo identificar el numero del cliente. Pidele amablemente el numero o nombre con que hizo el pedido.",
    };
  }

  try {
    // Mismas variantes de telefono que customer-history (clave para encontrarlo)
    const phoneClean = phone.replace(/\D/g, "");
    const phoneVariants = [
      phoneClean,
      phoneClean.startsWith("521") ? phoneClean.slice(3) : null,
      phoneClean.startsWith("52") ? phoneClean.slice(2) : null,
      phoneClean.startsWith("521") ? "52" + phoneClean.slice(3) : null,
    ].filter(Boolean) as string[];

    // SOLO los pedidos de ESTE telefono (seguridad: nadie ve pedidos ajenos)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerPhone: { in: phoneVariants } },
          { botPhone: { in: phoneVariants } },
        ],
        status: { in: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { select: { title: true, quantity: true, unit: true } } },
    });

    if (orders.length === 0) {
      return {
        success: true,
        sin_pedidos: true,
        instruccion_para_ia: "No hay ningun pedido a nombre de este numero. Dile amablemente que no encuentras un pedido activo a este numero y preguntale si lo hizo con otro numero o nombre. NO escales a humano por esto.",
      };
    }

    // El pedido mas reciente es el relevante
    const o = orders[0];
    const info = STATUS_CLIENTE[o.status] ?? { estado: o.status, instruccion: "Informa el estado al cliente." };
    const telas = o.items.map((i) => `${i.quantity} ${i.unit ?? "kg"} ${i.title}`).join(", ");
    const guia = (o as any).trackingNumber || (o as any).guia || null;

    return {
      success: true,
      pedido: {
        numero: o.orderNumber,
        estado_cliente: info.estado,
        telas,
        total: o.total,
        guia: guia ?? null,
        fecha_pedido: o.createdAt.toISOString(),
      },
      otros_pedidos: orders.length > 1 ? orders.length - 1 : 0,
      instruccion_para_ia: `${info.instruccion} Pedido: ${telas} (${o.orderNumber}).${guia ? ` Guia de rastreo: ${guia}.` : ""}${orders.length > 1 ? ` El cliente tiene ${orders.length - 1} pedido(s) mas; si pregunta por otro, ayudalo.` : ""} Responde corto y humano, sin tecnicismos.`,
    };
  } catch (err) {
    log.error({ err, phone }, "Error consultando estado de pedido");
    return {
      success: false,
      instruccion_para_ia: "Hubo un problema consultando el pedido. Pide disculpas breves y ofrece checarlo en un momento.",
    };
  }
}
