/**
 * Detector de telas FUERA del catálogo de Coyote.
 *
 * Coyote vende 48 telas (Alaska, Apolo, Sportok, Athlos, Felpa, Lycra, etc.).
 * Cuando un cliente pide una tela NO manejada (manta, popelina, lino, casimir...),
 * el bot DEBE registrarla como oportunidad perdida usando registrar_tela_no_manejada.
 *
 * PROBLEMA REAL: GPT a veces ignora esa regla, especialmente bajo rate-limit o
 * timeout. Resultado: la oportunidad NO se registra y el cliente recibe
 * "Disculpe, tuve un problema procesando..." sin que nadie se entere.
 *
 * SOLUCIÓN DETERMINÍSTICA: detectamos en código las palabras-clave de telas
 * externas. Si el mensaje las contiene Y NO menciona ninguna tela del catálogo,
 * forzamos el registro ANTES de mandar a GPT.
 */
import { products } from "@/lib/products";

// Telas que Coyote NO maneja pero clientes piden seguido (B2B textil MX)
const TELAS_EXTERNAS = [
  "manta",
  "popelina",
  "lino",
  "casimir",
  "cachemira",
  "cachemir",
  "gabardina",
  "dril",
  "mezclilla",
  "denim",
  "lana",
  "seda",
  "lycra spandex puro",
  "satin",
  "satín",
  "raso",
  "tafeta",
  "tafetán",
  "chiffon",
  "gasa",
  "encaje",
  "tul",
  "terciopelo",
  "pana",
  "felpa peluche",
  "vinilo",
  "lonita",
  "loneta",
  "yute",
  "fieltro",
  "neopreno",
  "softshell",
  "indumentaria militar",
  "manta cruda",
  "blanca de algodon",
  "blanca de algodón",
  "algodón crudo",
  "100% algodon",
  "100% algodón",
  "100 algodon",
  "100 algodón",
];

// Pre-computamos los títulos del catálogo en minúsculas
const CATALOGO_TITULOS = products.map((p) => p.title.toLowerCase());

export interface TelaNoManejadaDetection {
  detected: boolean;
  telaIdentificada?: string;
  matched?: string; // la palabra clave que matcheó
  reason?: "external_tela" | "explicit_cotton";
}

export function detectTelaNoManejada(mensaje: string): TelaNoManejadaDetection {
  if (!mensaje || mensaje.length < 3) {
    return { detected: false };
  }

  const lower = mensaje.toLowerCase();

  // Paso 1: ¿menciona alguna tela del CATÁLOGO? Si sí, NO triggerea.
  // (Cliente pide Sportok + "casimir como referencia" → no es alerta)
  for (const titulo of CATALOGO_TITULOS) {
    // Usamos word boundary para evitar falsos positivos
    const regex = new RegExp(`\\b${escapeRegex(titulo)}\\b`, "i");
    if (regex.test(lower)) {
      // Sí menciona catálogo. Asumimos que GPT puede manejar la conversación.
      return { detected: false };
    }
  }

  // Paso 2: ¿menciona alguna tela EXTERNA?
  for (const externa of TELAS_EXTERNAS) {
    const regex = new RegExp(`\\b${escapeRegex(externa)}\\b`, "i");
    if (regex.test(lower)) {
      return {
        detected: true,
        telaIdentificada: externa,
        matched: externa,
        reason: "external_tela",
      };
    }
  }

  return { detected: false };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}