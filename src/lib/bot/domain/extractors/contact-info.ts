/**
 * Extractor de email y nombre del mensaje del cliente.
 *
 * Mismos principios que postal-code.ts:
 *  - Heurísticas que aceptan typos comunes (coma en vez de punto, espacios)
 *  - Confianza alta vs media
 *  - Validación mínima sin pedirle al LLM
 *
 * Se llama desde el orquestador antes de la llamada a GPT, para que cuando
 * GPT arme su respuesta ya tenga los datos en el perfil.
 */

export interface ExtractedEmail {
  email: string;
  position: number;
  confidence: "high" | "medium";
}

export interface ExtractedName {
  nombre: string;
  position: number;
  confidence: "high" | "medium";
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────

/**
 * Patrón robusto para email. Acepta:
 *  - jack@gmail.com
 *  - jack.rizk@empresa.com.mx
 *  - jack_99@correo.org
 *  - mayúsculas (las normalizamos a lowercase)
 *
 * Maneja typos comunes via normalización antes del match:
 *  - " @ " → "@"
 *  - "user@domain,com" → "user@domain.com"
 */
const EMAIL_PATTERN = /\b([a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?)@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+)\b/gi;

// Frases tipo "mi correo es jack@..." aumentan confianza
const EMAIL_CONTEXT_PHRASES =
  /(?:correo|email|e-?mail|mail|contacto)\s*(?:es|:)?\s*/i;

export function extractEmails(message: string): ExtractedEmail[] {
  if (!message) return [];

  // Normalizar: espacios alrededor del @, coma en lugar de punto en TLD,
  // typos comunes de "gmail.con" / "hotmial" no los arreglamos, dejamos al usuario.
  let normalized = message
    .replace(/\s*@\s*/g, "@") // "user @ domain" → "user@domain"
    .replace(/@([a-z0-9-]+),([a-z]{2,})\b/gi, "@$1.$2"); // coma → punto en TLD

  EMAIL_PATTERN.lastIndex = 0;
  const found = new Map<string, ExtractedEmail>();
  let m: RegExpExecArray | null;

  while ((m = EMAIL_PATTERN.exec(normalized)) !== null) {
    const fullEmail = `${m[1]}@${m[2]}`.toLowerCase();
    if (!isValidEmail(fullEmail)) continue;

    // Heurística de confianza: si hay frase tipo "mi correo es ..." cerca, es high
    const ctx = normalized
      .slice(Math.max(0, m.index - 30), m.index)
      .toLowerCase();
    const confidence = EMAIL_CONTEXT_PHRASES.test(ctx) ? "high" : "medium";

    if (!found.has(fullEmail)) {
      found.set(fullEmail, {
        email: fullEmail,
        position: m.index,
        confidence,
      });
    }
  }

  return Array.from(found.values()).sort((a, b) => a.position - b.position);
}

export function firstEmail(message: string): string | null {
  const emails = extractEmails(message);
  if (emails.length === 0) return null;
  const high = emails.find((e) => e.confidence === "high");
  return (high ?? emails[0]).email;
}

export function isValidEmail(maybeEmail: string): boolean {
  if (!maybeEmail) return false;
  if (maybeEmail.length > 254) return false;
  // Regex estricto basado en RFC 5322 simplificado
  const strict =
    /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+$/i;
  if (!strict.test(maybeEmail)) return false;

  // Rechazar dominios obviamente falsos
  const blacklist = [
    "example.com",
    "test.com",
    "asd.com",
    "asdf.com",
    "nose.com",
    "xx.com",
    "aa.com",
  ];
  const domain = maybeEmail.split("@")[1].toLowerCase();
  if (blacklist.includes(domain)) return false;

  return true;
}

// ─── NOMBRE ──────────────────────────────────────────────────────────────────

/**
 * Heurística simple para detectar nombre en el mensaje.
 *
 * Patrones que reconoce:
 *  - "soy Juan Pérez"
 *  - "me llamo Juan"
 *  - "mi nombre es Juan Pérez"
 *  - "Soy Juan, mi correo..."
 *  - "Juan Pérez juan@gmail.com" (nombre antes del email)
 *
 * NO reconoce nombres sueltos sin contexto porque son ambiguos
 * ("Sportok" podría parecer nombre).
 */
const NAME_PATTERNS = [
  // "soy Juan", "me llamo Juan", "mi nombre es Juan"
  /(?:soy|me\s+llamo|mi\s+nombre\s+es|nombre:|llamame)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})/i,
  // Inicio de mensaje: "Juan Pérez, soy de..." o "Juan Pérez. mi email es..."
  /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})(?:\s*[,.\n])/,
];

// Palabras que NO son nombres aunque empiecen con mayúscula
const NOT_NAMES = new Set([
  "hola",
  "buenas",
  "buen",
  "buenos",
  "días",
  "tardes",
  "noches",
  "señor",
  "señora",
  "sí",
  "si",
  "no",
  "gracias",
  "mande",
  "ok",
  "okay",
  "perdón",
  "disculpe",
  "atte",
  "saludos",
  "cordialmente",
  "sportok",
  "micropique",
  "felpa",
  "alaska",
  "coyote",
  "textil",
]);

export function extractNames(message: string): ExtractedName[] {
  if (!message) return [];

  const found: ExtractedName[] = [];

  for (const pattern of NAME_PATTERNS) {
    pattern.lastIndex = 0;
    const m = pattern.exec(message);
    if (!m) continue;
    const candidate = m[1].trim();
    if (!isValidName(candidate)) continue;
    found.push({
      nombre: capitalizeName(candidate),
      position: m.index,
      confidence: "high",
    });
  }

  // Dedupe por nombre
  const unique = new Map<string, ExtractedName>();
  for (const n of found) {
    if (!unique.has(n.nombre.toLowerCase())) {
      unique.set(n.nombre.toLowerCase(), n);
    }
  }

  return Array.from(unique.values()).sort((a, b) => a.position - b.position);
}

export function firstName(message: string): string | null {
  const names = extractNames(message);
  if (names.length === 0) return null;
  return names[0].nombre;
}

export function isValidName(maybeName: string): boolean {
  if (!maybeName) return false;
  const trimmed = maybeName.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return false;

  // Debe tener al menos una letra
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(trimmed)) return false;

  // Rechazar si primera palabra es palabra-no-nombre
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  if (NOT_NAMES.has(firstWord)) return false;

  // Rechazar puro número o símbolos
  if (/^[0-9\W]+$/.test(trimmed)) return false;

  // Rechazar repetición sospechosa "asdfasdf", "xxxxx"
  if (/^(.)\1{3,}$/.test(trimmed.toLowerCase().replace(/\s/g, ""))) return false;

  return true;
}

function capitalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

// ─── HELPER COMBINADO ────────────────────────────────────────────────────────

/**
 * Extrae nombre Y email del mensaje en una sola pasada.
 * Devuelve solo los que se hayan detectado con confianza.
 */
export function extractContactInfo(message: string): {
  nombre: string | null;
  email: string | null;
} {
  return {
    nombre: firstName(message),
    email: firstEmail(message),
  };
}
