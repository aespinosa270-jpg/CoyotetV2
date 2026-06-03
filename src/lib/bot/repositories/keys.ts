/**
 * Registro central de keys de Redis.
 *
 * Todas las claves que escribe el bot v2 pasan por aquí. Beneficios:
 * - Un solo lugar para auditar el namespace.
 * - Cambiar el prefijo (rollback completo) es modificar UNA constante.
 * - Imposible escribir una key con typo desde otra parte del código.
 * - Si algún día queremos compartir keys con v1, basta poner KEY_PREFIX = "".
 *
 * Convención: las funciones que reciben datos del usuario sanitizan o validan
 * para evitar inyección de delimitadores en la key.
 */

const PREFIX = "v2";

function safe(input: string): string {
  // Permitimos solo dígitos, letras y guiones bajos. Cualquier otra cosa la
  // reemplazamos. Esto evita que un teléfono malicioso o un ID raro reviente
  // el namespace.
  return input.replace(/[^a-zA-Z0-9_]/g, "");
}

export const keys = {
  // ── Cliente / perfil ────────────────────────────────────────────────────
  cliente: (phone: string) => `${PREFIX}:cliente:${safe(phone)}`,

  // ── Conversación ────────────────────────────────────────────────────────
  historial: (phone: string) => `${PREFIX}:historial:${safe(phone)}`,
  /** Resumen semántico generado periódicamente para clientes con historial largo. */
  resumenSemantico: (phone: string) => `${PREFIX}:resumen:${safe(phone)}`,
  /** Memoria de largo plazo (Fase 4) */
  memoria: (phone: string) => `${PREFIX}:memoria:${safe(phone)}`,
  /** FASE 12-fix: media (image/audio/video) recibida del cliente */
  media: (phone: string) => `${PREFIX}:media:${safe(phone)}`,
  /** FEATURE 3: bot pausado para esta conversación (control humano activo). TTL 23h. */
  botPaused: (phone: string) => `${PREFIX}:paused:${safe(phone)}`,

  // ── Pedidos ─────────────────────────────────────────────────────────────
  /** ACCION RAPIDA: conversacion marcada como atendida por un humano. */
  atendido: (phone: string) => `${PREFIX}:atendido:${safe(phone)}`,
  /** ACCION RAPIDA: etiquetas manuales del cliente (hot, mayoreo, etc.). */
  tags: (phone: string) => `${PREFIX}:tags:${safe(phone)}`,
  /** NOTAS INTERNAS: texto privado del agente sobre el cliente (no se envia). */
  notas: (phone: string) => `${PREFIX}:notas:${safe(phone)}`,

  pedidos: (phone: string) => `${PREFIX}:pedidos:${safe(phone)}`,

  // ── Configuración del bot (lo que Jack edita) ───────────────────────────
  config: () => `${PREFIX}:config`,

  // ── Catálogo (overlay sobre src/lib/products.ts) ────────────────────────
  catalogOverlay: () => `${PREFIX}:catalog:overlay`,

  // ── Defensas ────────────────────────────────────────────────────────────
  rateLimit: (phone: string, minute: number) =>
    `${PREFIX}:rate:${safe(phone)}:${minute}`,
  /** TTL corto (5 min) para deduplicar mensajes ya procesados. */
  dedupe: (channelMessageId: string) =>
    `${PREFIX}:dedupe:${safe(channelMessageId)}`,

  // ── Onboarding / privacidad ─────────────────────────────────────────────
  /** Token transitorio para verificar correo en flujo de bienvenida. */
  emailVerification: (phone: string) =>
    `${PREFIX}:verify:email:${safe(phone)}`,

  // ── Recordatorios programados ───────────────────────────────────────────
  /** Set ordenado por timestamp para procesar con cron job. */
  remindersQueue: () => `${PREFIX}:reminders:queue`,

  // ── Métricas / observabilidad ───────────────────────────────────────────
  /** Contador diario de eventos por tipo. Key sufijada por YYYY-MM-DD. */
  metricCounter: (event: string, day: string) =>
    `${PREFIX}:metrics:${safe(event)}:${safe(day)}`,

  // ── Locks (operaciones que no deben correr en paralelo) ─────────────────
  /** Lock para evitar generar dos links de pago simultáneos al mismo cliente. */
  paymentLock: (phone: string) => `${PREFIX}:lock:payment:${safe(phone)}`,
} as const;

/** Solo para debugging/admin. Permite saber el prefijo actual sin importar PREFIX. */
export function getKeyPrefix(): string {
  return PREFIX;
}
