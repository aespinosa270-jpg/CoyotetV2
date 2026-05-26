/**
 * Handler de tool consultar_transportistas.
 *
 * Devuelve transportistas organizados por zona de CDMX para que el cliente
 * pueda recoger su paquete y enviarlo por su cuenta (opcion mas barata
 * que Skydropx para algunos destinos, especialmente sureste/Chiapas).
 *
 * Si se pasa destino, prioriza los que tienen ese destino en su array.
 */
import type { BotContext } from "../core/types";
import { prisma } from "@/lib/prisma";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "tools/transportistas" });

export interface ConsultarTransportistasArgs {
  destino?: string;
}

const ZONA_LABELS: Record<string, { label: string; emoji: string; sublabel: string }> = {
  cabeza_juarez: {
    label: "Cabeza de Juarez",
    emoji: "📍",
    sublabel: "Iztapalapa",
  },
  centro: {
    label: "Centro Historico",
    emoji: "📍",
    sublabel: "Cuauhtemoc",
  },
  vallejo: {
    label: "Vallejo (Norte)",
    emoji: "📍",
    sublabel: "Gustavo A. Madero",
  },
  tapo: {
    label: "TAPO",
    emoji: "📍",
    sublabel: "Venustiano Carranza",
  },
  otro: {
    label: "Otra zona",
    emoji: "📍",
    sublabel: "",
  },
};

export async function ejecutarConsultarTransportistas(
  args: ConsultarTransportistasArgs,
  ctx: BotContext
): Promise<unknown> {
  try {
    const destinoNormalizado = args.destino?.toLowerCase().trim() ?? "";

    const transportistas = await prisma.transportista.findMany({
      where: { activo: true },
      orderBy: [{ zona: "asc" }, { nombre: "asc" }],
    });

    if (transportistas.length === 0) {
      return {
        success: false,
        estado: "No hay transportistas registrados. Solo tenemos Skydropx por ahora.",
      };
    }

    // Si hay destino, marcar los que matchean
    const matchDestino = destinoNormalizado
      ? (t: typeof transportistas[0]) =>
          t.destinos.some((d) => d.toLowerCase().includes(destinoNormalizado)) ||
          t.destinos.some((d) => d.toLowerCase().includes("nacional"))
      : null;

    // Agrupar por zona
    const porZona = new Map<string, typeof transportistas>();
    for (const t of transportistas) {
      if (!porZona.has(t.zona)) porZona.set(t.zona, []);
      porZona.get(t.zona)!.push(t);
    }

    // Construir respuesta legible para GPT
    const lineas: string[] = [];

    if (destinoNormalizado) {
      // Buscar los que matchean exacto
      const matches = transportistas.filter(matchDestino!);
      if (matches.length > 0) {
        lineas.push(`🎯 ESPECIALISTAS para ${args.destino}:`);
        matches.slice(0, 5).forEach((t) => {
          const zonaInfo = ZONA_LABELS[t.zona] ?? ZONA_LABELS.otro;
          lineas.push(`  • ${t.nombre} — ${zonaInfo.label} (${zonaInfo.sublabel})${t.notas ? ` — ${t.notas}` : ""}`);
        });
        lineas.push("");
      }
    }

    // Lista completa por zona
    lineas.push("PAQUETERIAS DE RUTA disponibles en CDMX (cliente recoge/lleva su paquete):");
    lineas.push("");

    for (const [zona, lista] of porZona) {
      const info = ZONA_LABELS[zona] ?? ZONA_LABELS.otro;
      lineas.push(`${info.emoji} ${info.label.toUpperCase()} (${info.sublabel}):`);
      lineas.push(`   ${lista.map((t) => t.nombre).join(", ")}`);
      lineas.push("");
    }

    lineas.push(
      "INSTRUCCION para GPT: Sugiere al cliente 2-3 opciones MAXIMO segun el destino. " +
      "Si no menciono destino, ofrece las 3 zonas y pregunta cual le queda mas cerca. " +
      "Recuerdale que estas son OPCION ADICIONAL a nuestro envio normal por Skydropx."
    );

    log.info(
      { destino: destinoNormalizado, count: transportistas.length },
      "Transportistas consultados"
    );

    return {
      success: true,
      estado: lineas.join("\n"),
      total: transportistas.length,
      destino: args.destino ?? null,
    };
  } catch (err) {
    log.error({ err }, "Error consultando transportistas");
    return {
      success: false,
      estado: "Error tecnico consultando transportistas. Continua sin esta info.",
    };
  }
}