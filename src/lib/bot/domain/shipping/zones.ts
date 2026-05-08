/**
 * Zonas de envío de Coyote Textil.
 *
 * Mapea el prefijo de CP (los primeros 2 dígitos, o sea floor(cp/1000))
 * a una zona con distancia y tipo de envío.
 *
 * - COYOTE: usa flotilla propia. Costo se calcula con consumo de diésel.
 * - SKYDROPX: paquetería externa. Costo es base + sobrepeso.
 *
 * Esta tabla se extrajo del monolito v1. Si Jack abre nuevas rutas o cambia
 * tarifas, este es el archivo a tocar.
 */

export type TipoEnvio = "COYOTE" | "SKYDROPX";

export interface ZonaEnvio {
  tipo: TipoEnvio;
  /** Distancia ida desde bodega (km). 0 si es paquetería. */
  distanciaKm: number;
  /** Etiqueta humana para logs y cotizaciones. Ej: "CDMX Centro". */
  etiqueta: string;
}

/**
 * Resuelve la zona a partir del CP.
 *
 * Acepta strings de cualquier formato; hace su propia limpieza:
 *  - "57170" → ok
 *  - "  57170 " → ok
 *  - "06-100" → "06100"
 *  - "abc" → "00000" (default fuera de zona)
 */
export function resolverZona(cp: string): ZonaEnvio {
  const cpLimpio = cp
    .replace(/\D/g, "")
    .padStart(5, "0")
    .slice(0, 5);

  const cpValido = /^\d{5}$/.test(cpLimpio) && parseInt(cpLimpio, 10) > 0;
  if (!cpValido) {
    return {
      tipo: "SKYDROPX",
      distanciaKm: 0,
      etiqueta: "CP inválido — paquetería",
    };
  }

  const prefix2 = Math.floor(parseInt(cpLimpio, 10) / 1000);

  // ── CDMX (01-16) ─────────────────────────────────────────────────
  if (prefix2 >= 1 && prefix2 <= 16) {
    if ([15, 6, 8].includes(prefix2)) {
      return { tipo: "COYOTE", distanciaKm: 5, etiqueta: "CDMX Centro" };
    }
    if ([7, 9, 3].includes(prefix2)) {
      return { tipo: "COYOTE", distanciaKm: 12, etiqueta: "CDMX Cercano" };
    }
    if ([2, 4, 11].includes(prefix2)) {
      return { tipo: "COYOTE", distanciaKm: 18, etiqueta: "CDMX Medio" };
    }
    return { tipo: "COYOTE", distanciaKm: 28, etiqueta: "CDMX Periférico" };
  }

  // ── Estado de México (50-57) ─────────────────────────────────────
  if (prefix2 >= 50 && prefix2 <= 57) {
    if (prefix2 === 57) {
      return { tipo: "COYOTE", distanciaKm: 10, etiqueta: "Edomex Cercano" };
    }
    if (prefix2 === 55) {
      return { tipo: "COYOTE", distanciaKm: 20, etiqueta: "Edomex Norte" };
    }
    if (prefix2 === 53 || prefix2 === 54) {
      return {
        tipo: "COYOTE",
        distanciaKm: 25,
        etiqueta: "Edomex Naucalpan/Tlalnepantla",
      };
    }
    if (prefix2 === 56) {
      return { tipo: "COYOTE", distanciaKm: 35, etiqueta: "Edomex Oriente" };
    }
    if (prefix2 === 52) {
      return { tipo: "COYOTE", distanciaKm: 55, etiqueta: "Edomex Lejano" };
    }
    // 50, 51 (Toluca y zona)
    return { tipo: "COYOTE", distanciaKm: 70, etiqueta: "Toluca / Edomex" };
  }

  // ── Hidalgo / Pachuca (42-43) ────────────────────────────────────
  if (prefix2 === 42 || prefix2 === 43) {
    return { tipo: "COYOTE", distanciaKm: 100, etiqueta: "Hidalgo / Pachuca" };
  }

  // ── Puebla (72-75) ───────────────────────────────────────────────
  if (prefix2 >= 72 && prefix2 <= 75) {
    return { tipo: "COYOTE", distanciaKm: 130, etiqueta: "Puebla" };
  }

  // ── Cuernavaca / Morelos (62) ────────────────────────────────────
  if (prefix2 === 62) {
    return { tipo: "COYOTE", distanciaKm: 90, etiqueta: "Cuernavaca / Morelos" };
  }

  // ── Resto del país: paquetería ───────────────────────────────────
  return { tipo: "SKYDROPX", distanciaKm: 0, etiqueta: "Paquetería nacional" };
}