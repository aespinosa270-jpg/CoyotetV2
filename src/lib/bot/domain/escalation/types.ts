/**
 * Tipos del módulo de escalación.
 */

export type RazonEscalacion =
  | "queja"
  | "humano"
  | "alto_valor"
  | "retries"
  | "frustracion"
  | "facturacion";

export const RAZON_LABELS: Record<RazonEscalacion, string> = {
  queja: "Queja / molestia explícita",
  humano: "Cliente pide humano",
  alto_valor: "Pedido alto valor (>300 kg)",
  retries: "Bot con hallucinations recurrentes",
  frustracion: "Cliente repite sin resolución",
  facturacion: "Facturación compleja",
};

export const RAZON_EMOJI: Record<RazonEscalacion, string> = {
  queja: "😠",
  humano: "👤",
  alto_valor: "💰",
  retries: "🤖",
  frustracion: "😤",
  facturacion: "📄",
};

export interface DetectionResult {
  detected: boolean;
  razon?: RazonEscalacion;
  contexto?: string;
  severity?: "low" | "medium" | "high";
}

export interface EscalationInput {
  phone: string;
  nombre?: string;
  razon: RazonEscalacion;
  contexto: string;
  ultimoMsg: string;
}
