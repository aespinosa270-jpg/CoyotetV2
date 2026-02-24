// src/lib/pricing.ts

export type MembershipTier = 'NONE' | 'GOLD' | 'BLACK' | 'ELITE';

// Devuelve el multiplicador de precio (ej. 0.90 = 10% de descuento)
export function getDiscountMultiplier(tier?: MembershipTier | string): number {
  switch (tier) {
    case 'GOLD': return 0.90;  // 10% Descuento
    case 'BLACK': return 0.85; // 15% Descuento
    case 'ELITE': return 0.85; // 15% Descuento (El envío gratis se calcula en el checkout)
    case 'NONE':
    default: return 1.0;       // Precio de lista (Mortales)
  }
}

// Devuelve el texto comercial del descuento
export function getTierBadge(tier?: MembershipTier | string): string {
  switch (tier) {
    case 'GOLD': return '🔥 SOCIO GOLD (-10%)';
    case 'BLACK': return '👑 SOCIO BLACK (-15%)';
    case 'ELITE': return '🐺 MASTER ELITE (-15% + ENVÍO GRATIS)';
    default: return 'CLIENTE BÁSICO';
  }
}