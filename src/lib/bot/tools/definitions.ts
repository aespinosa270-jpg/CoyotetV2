import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const BOT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calcular_envio",
      description: "Calcula el costo real de envío logístico basado en el código postal y los kilos/rollos del pedido.",
      parameters: {
        type: "object",
        properties: {
          cp: { type: "string", description: "Código postal de 5 dígitos (ej. 57170)" },
          productos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                kg: { type: "number", description: "Cantidad en kilos" }
              },
              required: ["nombre", "kg"]
            }
          },
          subtotal: { type: "number", description: "Suma total de los productos sin envío ni IVA" },
          requiere_factura: { type: "boolean", description: "Si el cliente pidió factura" }
        },
        required: ["cp", "productos", "subtotal", "requiere_factura"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generar_cobro_stripe",
      description: "Genera un link de pago seguro vía Stripe para pagos con tarjeta de crédito/débito o efectivo en OXXO.",
      parameters: {
        type: "object",
        properties: {
          monto: { type: "number", description: "Monto total exacto a cobrar en MXN" },
          metodo: { type: "string", enum: ["tarjeta", "oxxo"], description: "Método de pago preferido" },
          con_factura: { type: "boolean" },
          rfc: { type: "string", description: "RFC del cliente (solo si requiere factura)" },
          razon_social: { type: "string" },
          cp_fiscal: { type: "string" },
          regimen_fiscal: { type: "string" },
          uso_cfdi: { type: "string" }
        },
        required: ["monto", "metodo", "con_factura"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generar_cobro_spei",
      description: "Devuelve los datos bancarios y la referencia única para que el cliente haga una transferencia SPEI.",
      parameters: {
        type: "object",
        properties: {
          monto: { type: "number", description: "Monto total exacto a cobrar en MXN" }
        },
        required: ["monto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "escalar_a_humano",
      description: "Transfiere la conversación a un agente humano en el CRM cuando hay una queja grave o duda fuera del catálogo.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "Explicación breve de por qué se transfiere el chat" },
          prioridad: { type: "string", enum: ["alta", "media", "baja"] }
        },
        required: ["motivo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "actualizar_datos_cliente",
      description: "Actualiza el perfil del cliente en la base de datos de manera silenciosa con información extraída del chat.",
      parameters: {
        type: "object",
        properties: {
          direccion: { type: "string", description: "Dirección física completa de envío" },
          notas: { type: "string", description: "Cualquier preferencia importante o detalle a recordar" },
          etapa_abandono: { type: "string", enum: ["carrito", "cotizacion", "pago", "none"] }
        }
      }
    }
  }
];
