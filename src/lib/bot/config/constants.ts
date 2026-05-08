/**
 * Constantes del dominio.
 *
 * Todo número mágico que estaba esparcido en el monolito vive aquí.
 * Si necesitas tunear un parámetro, lo cambias en un solo lugar.
 */

// ── Logística ──────────────────────────────────────────────────────
export const SHIPPING = {
  /** Precio del litro de diésel (MXN). Se actualiza ocasionalmente. */
  DIESEL_PRICE_PER_LITER: 27.0,
  /** Consumo de la flotilla en L/100 km. */
  LITERS_PER_100KM: 20.0,
  /** Multiplicador operativo sobre el costo de combustible. */
  OPERATIONAL_MARKUP: 4,
  /** Tarifa fija de servicio por envío. */
  FIXED_SERVICE_FEE: 175,
  /** Capacidad máxima de rollos por vehículo. */
  MAX_ROLLS_PER_VEHICLE: 80,
  /** Kilos por rollo estándar de tela. */
  KG_PER_ROLL: 25,
  /** Tarifas de flete por número de rollos (escalón → MXN). */
  FREIGHT_TIERS: [
    { maxRolls: 1, maxKg: 10, price: 150 },
    { maxRolls: 1, maxKg: Infinity, price: 200 },
    { maxRolls: 4, maxKg: Infinity, price: 250 },
    { maxRolls: 10, maxKg: Infinity, price: 300 },
    { maxRolls: 15, maxKg: Infinity, price: 400 },
    { maxRolls: 20, maxKg: Infinity, price: 500 },
    { maxRolls: Infinity, maxKg: Infinity, price: 1000 },
  ],
} as const;

// ── IVA ────────────────────────────────────────────────────────────
export const TAX = {
  IVA_RATE: 0.16,
} as const;

// ── Datos SPEI ─────────────────────────────────────────────────────
export const SPEI_ACCOUNTS = [
  {
    bank: "BBVA",
    clabe: "012180015657512129",
    beneficiary: "Jack Rizk Cabrera",
  },
  {
    bank: "Santander",
    clabe: "014180606262821861",
    beneficiary: "Jack Rizk Cabrera",
  },
  {
    bank: "Banamex",
    clabe: "002180702340784354",
    beneficiary: "Jack Rizk Cabrera",
  },
] as const;

// ── Memoria / Conversación ─────────────────────────────────────────
export const MEMORY = {
  /** Máximo de mensajes que se conservan por conversación. */
  MAX_HISTORY_LENGTH: 80,
  /** TTL del historial en Redis (90 días en segundos). */
  HISTORY_TTL_SECONDS: 60 * 60 * 24 * 90,
  /** TTL del rate-limit por ventana (segundos). */
  RATE_LIMIT_WINDOW_SECONDS: 120,
  /** Cada cuántos mensajes se regenera el resumen semántico. */
  SEMANTIC_SUMMARY_INTERVAL: 10,
  /** Tamaño de la ventana de mensajes que entra al resumen. */
  SEMANTIC_SUMMARY_WINDOW: 40,
} as const;

// ── Scoring / Tácticas de venta ────────────────────────────────────
export const SALES = {
  /** Temperatura inicial para clientes nuevos (0–100). */
  INITIAL_TEMPERATURE: 30,
  /** Confianza inicial para clientes nuevos (0–100). */
  INITIAL_TRUST: 40,
  /** Umbrales para decidir táctica. */
  THRESHOLDS: {
    HOT: 70, // ≥70 → cierre directo
    WARM: 50, // ≥50 → urgencia / escasez
    COLD: 30,
  },
  /** Reset de temperatura tras una compra cerrada. */
  POST_PURCHASE_TEMPERATURE: 20,
} as const;

// ── Membresía Socios Coyote ────────────────────────────────────────
export const MEMBERSHIP_PLANS = {
  GOLD: {
    id: "GOLD",
    label: "🥇 GOLD — Socio Comercial",
    monthlyPrice: 299,
    yearlyPrice: 3233,
    pointsPer100Mxn: 1,
    freeShipmentsPerMonth: 1,
  },
  BLACK: {
    id: "BLACK",
    label: "⚫ BLACK — Socio Ejecutivo",
    monthlyPrice: 699,
    yearlyPrice: 7549,
    pointsPer100Mxn: 2,
    freeShipmentsPerMonth: 3,
  },
  ELITE: {
    id: "ELITE",
    label: "💎 ELITE — Master Partner",
    monthlyPrice: 1129,
    yearlyPrice: 12193,
    pointsPer100Mxn: 4,
    freeShipmentsPerMonth: 6,
  },
} as const;

export type MembershipPlanId = keyof typeof MEMBERSHIP_PLANS;

// ── Reintentos / Resiliencia ───────────────────────────────────────
export const RESILIENCE = {
  WHATSAPP_SEND_RETRIES: 2,
  STRIPE_TIMEOUT_MS: 8_000,
  OPENAI_TIMEOUT_MS: 30_000,
  /** Backoff base para reintentos (ms). Crece linealmente con el intento. */
  BACKOFF_BASE_MS: 1_000,
} as const;