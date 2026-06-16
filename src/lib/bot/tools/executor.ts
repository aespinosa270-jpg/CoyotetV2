import { getLogger } from "../observability/logger";
import type { BotContext } from "../core/types";
import { calcularEnvioHandler } from "./handlers/calcular-envio";
import { generarCobroStripeHandler, generarCobroSpeiHandler } from "./handlers/generar-cobros";
import { escalarAHumanoHandler } from "./handlers/escalar";
import { consultarEstadoPedidoHandler } from "./handlers/consultar-estado-pedido";
import {
  ejecutarObtenerInfoMembresias,
  ejecutarProponerMembresia,
} from "./membership-handlers";
import { ejecutarAplicarCodigoReferido } from "./referrals-handler";
import { ejecutarConsultarTransportistas } from "./transportistas-handler";
import {
  ejecutarRegistrarTelaNoManejada,
  ejecutarProgramarVolumen,
} from "./fase12-handlers";
import { createOrderFromBot } from "../services/crm/order-creator";

const log = getLogger({ module: "tool-executor" });

export async function executeTool(toolCall: any, context: BotContext): Promise<any> {
  log.info({ tool: toolCall.function.name }, "Routing Tool Call");

  try {
    const args = JSON.parse(toolCall.function.arguments);

    switch (toolCall.function.name) {
      case "calcular_envio":
        return await calcularEnvioHandler(args, context);

      case "generar_cobro_stripe": {
        // 1. Generar el link Stripe (lógica original)
        const stripeResult = await generarCobroStripeHandler(args, context);

        // 2. FASE 12: si tiene productos, crear orden en CRM automáticamente
        if (args.productos && Array.isArray(args.productos) && args.productos.length > 0) {
          await crearOrdenDesdeArgs(args, context, "card", stripeResult);
        }

        return stripeResult;
      }

      case "generar_cobro_spei": {
        const speiResult = await generarCobroSpeiHandler(args, context);

        if (args.productos && Array.isArray(args.productos) && args.productos.length > 0) {
          await crearOrdenDesdeArgs(args, context, "spei", speiResult);
        }

        return speiResult;
      }

      case "escalar_a_humano":
        return await escalarAHumanoHandler(args, context);

      case "actualizar_datos_cliente":
        return { success: true, estado: "Base de datos actualizada silenciosamente." };

      case "obtener_info_membresias":
        return await ejecutarObtenerInfoMembresias(args, context);

      case "proponer_membresia":
        return await ejecutarProponerMembresia(args, context);

      // ── FASE 12 ──
      case "registrar_tela_no_manejada":
        return await ejecutarRegistrarTelaNoManejada(args, context);

      case "programar_volumen_temporada":
        return await ejecutarProgramarVolumen(args, context);

      case "aplicar_codigo_referido":
        return await ejecutarAplicarCodigoReferido(args, context);

      case "consultar_transportistas":
        return await ejecutarConsultarTransportistas(args, context);

      case "consultar_estado_pedido":
        return await consultarEstadoPedidoHandler(args, context);

      default:
        log.warn({ tool: toolCall.function.name }, "Tool invocada no existe");
        return { error: `La herramienta ${toolCall.function.name} no está implementada.` };
    }
  } catch (error) {
    log.error({ err: error, tool: toolCall.function.name }, "Error ejecutando Tool");
    return { error: "Excepción interna del servidor al procesar los argumentos." };
  }
}

// ── Helper para crear orden desde args de cobro ─────────────────────

async function crearOrdenDesdeArgs(
  args: any,
  ctx: BotContext,
  paymentMethod: "card" | "spei",
  paymentResult: any
): Promise<void> {
  try {
    const phone = ctx.message.from.id;
    const productos = (args.productos ?? []) as Array<{
      titulo: string;
      sku?: string;
      cantidad: number;
      precio_unitario: number;
      color?: string;
    }>;

    const items = productos.map((p) => ({
      title: p.titulo,
      sku: p.sku,
      quantity: p.cantidad,
      price: p.precio_unitario,
      unit: "kg",
      color: p.color,
    }));

    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const total = args.monto;
    const freightCost = Math.max(0, total - subtotal);

    const result = await createOrderFromBot({
      clientePhone: phone,
      clienteNombre: ctx.profile.nombre,
      clienteEmail: (ctx.profile as any).email,
      items,
      subtotal,
      freightCost,
      total,
      paymentMethod,
      paymentId:
        paymentResult?.session_id ?? paymentResult?.payment_id ?? paymentResult?.reference,
      wantsInvoice: args.con_factura ?? false,
      address: args.direccion_envio,
      botConversationId: ctx.message.id,
    });

    if (result.ok) {
      log.info(
        { orderNumber: result.orderNumber, phone },
        "✅ Orden CRM creada automáticamente desde tool"
      );
    } else {
      log.error(
        { error: result.error, phone, args },
        "❌ Falló auto-creación de orden"
      );
    }
  } catch (err) {
    log.error({ err }, "Excepción en auto-creación de orden");
  }
}
