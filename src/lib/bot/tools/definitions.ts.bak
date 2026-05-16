// Le quitamos el tipo estricto de OpenAI para evitar el doble enrutamiento en chat.ts
export const BOT_TOOLS: any[] = [
  {
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
  },
  {
    name: "generar_cobro_stripe",
    description: "Genera un link de pago seguro vía Stripe para pagos con tarjeta de crédito/débito o efectivo en OXXO. CRÍTICO: además de generar el link, esto AUTOMÁTICAMENTE crea la orden en el sistema interno para que logística pueda despacharla cuando el cliente pague.",
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
        uso_cfdi: { type: "string" },
        productos: {
          type: "array",
          description: "Lista de productos del pedido. CRÍTICO para que se cree la orden correctamente en logística.",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Nombre del producto/tela" },
              sku: { type: "string" },
              cantidad: { type: "number", description: "Cantidad en kg o unidades" },
              precio_unitario: { type: "number", description: "Precio por unidad" },
              color: { type: "string" }
            },
            required: ["titulo", "cantidad", "precio_unitario"]
          }
        },
        direccion_envio: { type: "string", description: "Dirección completa de entrega" }
      },
      required: ["monto", "metodo", "con_factura", "productos"]
    }
  },
  {
    name: "generar_cobro_spei",
    description: "Devuelve los datos bancarios y la referencia única para que el cliente haga una transferencia SPEI. CRÍTICO: además de los datos bancarios, crea AUTOMÁTICAMENTE la orden en el sistema interno.",
    parameters: {
      type: "object",
      properties: {
        monto: { type: "number", description: "Monto total exacto a cobrar en MXN" },
        productos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              sku: { type: "string" },
              cantidad: { type: "number" },
              precio_unitario: { type: "number" },
              color: { type: "string" }
            },
            required: ["titulo", "cantidad", "precio_unitario"]
          }
        },
        direccion_envio: { type: "string" }
      },
      required: ["monto", "productos"]
    }
  },
  {
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
  },
  {
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
  },
  // ── FASE 11A — membresías proactivas ──
  {
    name: "obtener_info_membresias",
    description: "Devuelve información completa de los 4 planes de membresía de Coyote Textil. Llamar SOLO cuando el cliente pregunta directamente '¿qué membresías hay?', '¿cuánto cuesta GOLD?', etc.",
    parameters: {
      type: "object",
      properties: {
        plan_especifico: {
          type: "string",
          enum: ["NONE", "GOLD", "BLACK", "ELITE", "TODOS"],
          description: "Plan específico que el cliente pregunta, o TODOS si quiere comparativa. Default: TODOS"
        }
      }
    }
  },
  {
    name: "proponer_membresia",
    description: "Registra que el bot ACABA DE proponer una membresía al cliente en este turno. Llamar SOLO cuando efectivamente mencionaste la membresía en tu respuesta.",
    parameters: {
      type: "object",
      properties: {
        plan_propuesto: {
          type: "string",
          enum: ["GOLD", "BLACK", "ELITE"]
        },
        motivo: {
          type: "string",
          enum: ["objecion_precio", "compras_acumuladas", "interes_explicito"]
        }
      },
      required: ["plan_propuesto", "motivo"]
    }
  },
  // ── FASE 12 — telas no manejadas + programación volumen ──
  {
    name: "registrar_tela_no_manejada",
    description: "CRÍTICO: cuando un cliente pide o manda foto de una tela que NO está en nuestro catálogo (popelina, lino, casimir, mezclilla, gabardina, etc.), DEBES llamar este tool para registrar su interés. El equipo evaluará agregarla al catálogo si hay demanda. PRIMERO informa al cliente que la registramos.",
    parameters: {
      type: "object",
      properties: {
        tela_identificada: {
          type: "string",
          description: "Nombre de la tela que el cliente pidió (ej. 'popelina', 'lino', 'casimir')"
        },
        descripcion: {
          type: "string",
          description: "Descripción adicional de la tela según lo que vio el bot o vision"
        },
        cantidad_kg: {
          type: "number",
          description: "Cuántos kilos necesita aproximadamente, si lo mencionó"
        },
        frecuencia: {
          type: "string",
          enum: ["mensual", "quincenal", "unica", "estacional", "desconocida"]
        },
        uso_final: {
          type: "string",
          description: "Para qué la usaría (ej. 'uniformes escolares', 'camisas formales')"
        }
      },
      required: ["tela_identificada"]
    }
  },
  {
    name: "programar_volumen_temporada",
    description: "Cuando un cliente quiere reservar volumen de tela para una temporada futura (ej. 'para diciembre quiero 500kg de felpa cada mes', 'para temporada escolar necesito 200kg semanales'), llamar este tool para registrar la programación. Ofrécelo proactivamente cuando detectes señales como: 'para temporada', 'cada mes', 'durante X meses', 'fechas específicas', 'volumen fijo'.",
    parameters: {
      type: "object",
      properties: {
        tela_titulo: {
          type: "string",
          description: "Nombre exacto de la tela del catálogo (ej. 'Felpa Polar Premium')"
        },
        tela_sku: { type: "string", description: "SKU si lo conoces" },
        kg_por_periodo: {
          type: "number",
          description: "Cuántos kg necesita por periodo"
        },
        periodo: {
          type: "string",
          enum: ["mensual", "quincenal", "semanal", "unico"]
        },
        fecha_inicio: {
          type: "string",
          description: "Fecha de inicio en ISO (YYYY-MM-DD). Si solo dice 'diciembre', usa el primer día del mes próximo de diciembre."
        },
        duracion_meses: {
          type: "number",
          description: "Cuántos meses durará la programación"
        },
        notas: { type: "string" }
      },
      required: ["tela_titulo", "kg_por_periodo", "periodo", "fecha_inicio", "duracion_meses"]
    }
  }
];
