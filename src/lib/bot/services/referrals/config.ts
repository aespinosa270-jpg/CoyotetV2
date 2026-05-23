/**
 * Parametros del programa de referidos.
 * Hardcoded por ahora — si en el futuro se quiere editar desde admin,
 * se puede mover a runtime-config como brandVoice.
 */
export const REFERRALS_CONFIG = {
  /** Descuento aplicado al cliente NUEVO en su primera orden (MXN) */
  refereeDiscount: 500,

  /** Credito otorgado al cliente que recomienda (MXN) */
  referrerReward: 200,

  /** Monto minimo de orden para activar el referido (MXN) */
  minOrderAmount: 5000,

  /** Prefijo del codigo de referido */
  codePrefix: "COYOTE",
} as const;