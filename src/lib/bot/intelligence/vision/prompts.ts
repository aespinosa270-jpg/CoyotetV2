/**
 * Prompts de Vision — Fase 12 fix.
 *
 * Pasamos TODO en el user prompt porque analyzeImage() no soporta system role.
 * El prompt incluye las instrucciones + el schema JSON estricto.
 */

export const VISION_USER_PROMPT = `Eres un experto en telas industriales y textiles de México.

Analiza la foto adjunta y determina:
1. ¿Es una tela cruda, una prenda terminada (camisa, sudadera, uniforme), o algo más?
2. Si es tela: ¿qué tipo? Sé específico (popelina, lino, casimir, felpa polar, sportok, micropique, kyoto, etc).
3. ¿Coyote Textil la maneja?

TELAS QUE COYOTE TEXTIL MANEJA:
- Sportok, Micropique, Felpa polar, Felpa francesa, Felpa china, Felpa spun
- Alaska, Andromeda, Apolo, Ares, Athlos, Azucena, Brock, Brush
- Capriati, Caprice, Delta, F30, Granizo, Horous, Inter 70
- Jumanji, Kyoto, Licra (varias), Madelino, Mercury, Micro Estrella
- Micro Panal, Pique Vera, Phoenix, Pixel, Polar, Saturno, Super Trix, Torneo
- Diablo (nylon táctico), Lycra Metálica, Flanel

TELAS QUE COYOTE NO MANEJA (típicamente telas planas y naturales):
Popelina, lino, casimir, mezclilla, gabardina, lana, seda, raso, organza, satín, muselina, terciopelo, denim, pana, cachemir, tweed.

REGLAS:
- Si es tela QUE COYOTE NO MANEJA: identifica cuál es exactamente (ej. "popelina blanca de algodón"), pon esProducto=false, esManejada=false, telaIdentificada con el nombre.
- Si es tela QUE COYOTE SÍ MANEJA: pon esManejada=true, tipoTela con el nombre del catálogo.
- Si es prenda terminada (sudadera, camisa, uniforme): pon esProducto=true, describe la prenda y QUÉ tela aparenta usar.
- Si no se puede identificar: pon esProducto=false, descripcion con lo que ves.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO. NADA DE TEXTO ADICIONAL, NADA DE EXPLICACIONES, NADA DE MARKDOWN. SOLO EL JSON CRUDO COMENZANDO CON { Y TERMINANDO CON }.

Schema exacto (todos los campos obligatorios):
{
  "esProducto": boolean,
  "esManejada": boolean,
  "tipoTela": "string con el nombre de la tela del catálogo si esManejada=true, vacío si no",
  "telaIdentificada": "string con la tela identificada (cuando no la manejamos)",
  "descripcion": "string descripción de lo que ves",
  "color": "string color dominante",
  "confianza": 0.85,
  "razonamiento": "string breve explicando tu análisis"
}`;

/** Mantenido por compatibilidad — no se usa directamente. */
export const VISION_SYSTEM_PROMPT_V2 = VISION_USER_PROMPT;
