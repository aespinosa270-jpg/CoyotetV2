/**
 * Inyecta las reglas aprendidas al system prompt.
 * Se llama cada turno (función async) pero las reglas vienen cacheadas
 * en Redis con TTL infinito, así que solo es 1 read por turno.
 */
import { getActiveLearnedRules } from "../learning/rules-repo";

export async function buildLearnedRulesBlock(): Promise<string> {
  try {
    const rules = await getActiveLearnedRules();
    if (rules.length === 0) return "";

    const fechaUltima = rules
      .map((r) => new Date(r.fechaAgregada).getTime())
      .sort((a, b) => b - a)[0];
    const fechaTxt = new Date(fechaUltima).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const reglasTxt = rules
      .slice(0, 25)
      .map((r, i) => `${i + 1}. ${r.regla}`)
      .join("\n");

    return `
=== REGLAS APRENDIDAS DE OPERACIÓN (actualizado ${fechaTxt}) ===
Estas reglas vienen del análisis automatizado semanal del bot. Tienen PRIORIDAD ALTA sobre comportamiento default. Síguelas siempre:

${reglasTxt}
=== FIN REGLAS APRENDIDAS ===
`;
  } catch {
    return "";
  }
}