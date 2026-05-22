/**
 * Brand Voice — construye el bloque de "VOZ DE MARCA" para inyectar al
 * system prompt del bot V2, Sales Agent IA, y Aftercare generate.
 *
 * La voz de marca se edita en tiempo real desde /crm/admin/voz-de-marca
 * y se guarda en Redis (v2:config). Cache 30s — cambios se reflejan
 * automáticamente sin re-deploy.
 *
 * Si no hay voz configurada, devuelve string vacío y el prompt usa sus
 * defaults hardcoded (sin romper nada).
 */
import type { BrandVoice } from "../../config/runtime-config";

export function buildBrandVoiceBlock(voice: BrandVoice | null): string {
  if (!voice) return "";

  const parts: string[] = [];
  parts.push("═══════════════════════════════════════════");
  parts.push("VOZ DE MARCA COYOTE — Reglas editadas por el equipo");
  parts.push("═══════════════════════════════════════════");

  if (voice.tone && voice.tone.trim()) {
    parts.push(`TONO: ${voice.tone.trim()}`);
  }

  if (voice.signature && voice.signature.trim()) {
    parts.push(`FIRMA: Hablas como "${voice.signature.trim()}" cuando aplique.`);
  }

  if (voice.structuralRules && voice.structuralRules.trim()) {
    parts.push(`REGLAS ESTRUCTURALES:\n${voice.structuralRules.trim()}`);
  }

  if (voice.allowedPhrases && voice.allowedPhrases.length > 0) {
    parts.push(`FRASES PREFERIDAS (úsalas naturalmente):`);
    voice.allowedPhrases.forEach((p) => parts.push(`  ✓ "${p}"`));
  }

  if (voice.forbiddenPhrases && voice.forbiddenPhrases.length > 0) {
    parts.push(`FRASES PROHIBIDAS (NUNCA las uses):`);
    voice.forbiddenPhrases.forEach((p) => parts.push(`  ✗ "${p}"`));
  }

  if (voice.emojis && voice.emojis.length > 0) {
    parts.push(`EMOJIS PERMITIDOS: ${voice.emojis.join(" ")}`);
    parts.push(`(Usa 1-2 emojis por mensaje máximo, solo cuando aporten)`);
  }

  if (voice.extraNotes && voice.extraNotes.trim()) {
    parts.push(`NOTAS ADICIONALES:\n${voice.extraNotes.trim()}`);
  }

  if (voice.updatedAt) {
    parts.push(`(Voz de marca actualizada: ${voice.updatedAt})`);
  }

  parts.push("═══════════════════════════════════════════");

  return parts.join("\n");
}

/**
 * Versión COMPACTA para casos donde el contexto es escaso (ej. Aftercare
 * generate, donde el prompt es chico). Solo incluye tono + 2-3 frases
 * prohibidas críticas.
 */
export function buildBrandVoiceCompact(voice: BrandVoice | null): string {
  if (!voice) return "";

  const parts: string[] = [];
  if (voice.tone) parts.push(`TONO: ${voice.tone}`);
  if (voice.forbiddenPhrases && voice.forbiddenPhrases.length > 0) {
    parts.push(`NUNCA digas: ${voice.forbiddenPhrases.slice(0, 3).map((p) => `"${p}"`).join(", ")}`);
  }
  if (voice.signature) parts.push(`Firma como: ${voice.signature}`);
  return parts.join("\n");
}