/**
 * permisos.ts - Fuente de verdad de quien ve que en el CRM.
 *
 * Roles activos: ADMIN (Jack, ve todo) y VENDEDORA (ve solo operacion).
 * Tanto el menu (esconder) como el bloqueo por URL (Paso 2) leen de aqui.
 *
 * SOLO_ADMIN: prefijos de ruta que SOLO el admin puede ver/abrir.
 * Si una ruta empieza con alguno de estos prefijos, la vendedora no la ve
 * ni puede entrar por URL.
 */

export type Rol = "ADMIN" | "SUPERVISOR" | "VENDEDORA" | "LOGISTICA" | "CONTABILIDAD";

/** Roles con acceso total (ven todo, mandan en el CRM). */
export const ROLES_ADMIN: Rol[] = ["ADMIN", "SUPERVISOR"];

/** Rutas sensibles: SOLO admin. Todo lo demas es visible para vendedora. */
export const SOLO_ADMIN: string[] = [
  "/crm/admin/bot/metricas",
  "/crm/admin/bot/objeciones",
  "/crm/admin/bot/catalogo",
  "/crm/admin/bot/telas-solicitadas",
  "/crm/admin/bot/voz-de-marca",
  "/crm/admin/bot/sourcing-queue",
  "/crm/admin/bot/transportistas",
  "/crm/admin/bot/aftercare",
  "/crm/admin/bot/contactos",
  "/crm/admin/bot/programaciones",
  "/crm/admin/bot/config",
  "/crm/admin/bot/health",
  // Dashboard del bot (tiene dinero/metricas) - solo admin
  // OJO: es ruta exacta, se valida aparte abajo para no chocar con subrutas
  // CRM general completo
  "/crm/admin/leads",
  "/crm/admin/clientes",
  "/crm/admin/interacciones",
  "/crm/admin/productos",
  "/crm/admin/inventario",
  "/crm/admin/flotilla",
  "/crm/admin/tickets",
  "/crm/admin/reportes",
  "/crm/admin/agentes",
  "/crm/admin/horarios",
  "/crm/admin/calidad",
  "/crm/admin/auditoria",
  "/crm/admin/configuracion",
];

/** El Dashboard del bot (ruta EXACTA) tambien es solo-admin (tiene dinero). */
export const SOLO_ADMIN_EXACTO: string[] = [
  "/crm/admin",      // dashboard general
  "/crm/admin/bot",  // dashboard del bot
];

/** True si el rol tiene acceso total. */
export function esAdmin(role: string | null | undefined): boolean {
  return !!role && (ROLES_ADMIN as string[]).includes(role);
}

/** True si el rol puede ver/abrir la ruta dada. */
export function puedeVer(role: string | null | undefined, ruta: string): boolean {
  if (esAdmin(role)) return true; // admin ve todo
  // Vendedora: bloquear si es ruta sensible
  const exacto = SOLO_ADMIN_EXACTO.includes(ruta);
  if (exacto) return false;
  const prefijo = SOLO_ADMIN.some((p) => ruta === p || ruta.startsWith(p + "/"));
  return !prefijo;
}
