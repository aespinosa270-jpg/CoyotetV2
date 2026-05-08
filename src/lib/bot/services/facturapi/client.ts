/**
 * Helper de Facturapi.
 *
 * Facturapi es un REST API simple. No necesitamos un SDK pesado;
 * usamos `fetch` con Basic Auth (FACTURAPI_LIVE_SECRET_KEY como user, password vacÃ­o).
 *
 * Este archivo expone la URL base y un helper para construir headers.
 */
import { getEnv } from "../../config/env";

export const FACTURAPI_BASE_URL = "https://www.facturapi.io/v2";

/** Headers con Basic Auth para llamadas a Facturapi. */
export function buildFacturapiHeaders(): Record<string, string> {
  const env = getEnv();
  const auth = Buffer.from(`${env.FACTURAPI_LIVE_SECRET_KEY}:`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };
}

export type FetchFn = typeof fetch;
