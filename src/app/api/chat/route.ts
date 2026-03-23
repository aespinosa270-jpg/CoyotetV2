import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Faltan env vars de Upstash: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN');
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ==========================================
// 📦 PRECIOS DEFAULT (solo si Redis está vacío)
// ==========================================
const PRECIOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "micro piqué":       { menudeo: 90,  mayoreo: 85,  info: "100% Poliéster 145g. Dry-Fit alto rendimiento. Rend. 4.3m/kg. +35 colores." },
  "piqué vera":        { menudeo: 95,  mayoreo: 90,  info: "100% Poliéster 145g. Más suave que el micro. Rend. 4.3m/kg. +40 colores." },
  "micro panal":       { menudeo: 95,  mayoreo: 90,  info: "100% Poliéster 145g. Máxima transpiración. Rend. 4.3m/kg. +35 colores." },
  "torneo":            { menudeo: 105, mayoreo: 98,  info: "100% Poliéster 150g. Uso rudo/torneos. Rend. 4.3m/kg. +35 colores." },
  "athlos":            { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "brock":             { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "piqué vera sport":  { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "kyoto":             { menudeo: 155, mayoreo: 140, info: "145g. Tacto seda, caída premium. Rend. 4.0m/kg. Color único." },
  "panal plus":        { menudeo: 155, mayoreo: 140, info: "145g. Mayor cuerpo y estructura. Rend. 3.7m/kg. Color único." },
  "apolo":             { menudeo: 160, mayoreo: 145, info: "150g. Anti-pilling. Rend. 3.7m/kg. Color único." },
  "horous":            { menudeo: 160, mayoreo: 155, info: "145g. Moda deportiva urbana. Rend. 4.2m/kg. Color único." },
  "panal nitro":       { menudeo: 185, mayoreo: 170, info: "145g. Control de humedad extremo. Color único." },
};

// ==========================================
// 🔧 HELPERS REDIS
// ==========================================
async function getBodega() {
  const redis = getRedis();
  const guardado = await redis.get<typeof PRECIOS_DEFAULT>('bodega_coyote');
  if (!guardado) {
    await redis.set('bodega_coyote', PRECIOS_DEFAULT);
    return PRECIOS_DEFAULT;
  }
  return guardado;
}

async function actualizarPrecio(producto: string, campo: 'menudeo' | 'mayoreo', nuevoPrecio: number) {
  const redis = getRedis();
  const bodega = await getBodega();
  if (bodega[producto]) {
    bodega[producto][campo] = nuevoPrecio;
    await redis.set('bodega_coyote', bodega);
    return true;
  }
  return false;
}

// ==========================================
// 🚚 LÓGICA DE ENVÍO
// ==========================================
const LOGICA_ENVIOS_REAL = `
EL COSTO DE ENVÍO TIENE 3 PARTES:

1. TARIFA DE SERVICIO (siempre fija): $175 MXN

2. FLETE (carga de bultos):
   - Menos de 10kg: $150 | 1 rollo: $200 | 2-4 rollos: $250 | 5-10 rollos: $300
   - 11-15 rollos: $400 | 16-20 rollos: $500 | +20 rollos: $1,000

3. TRASLADO:
   A) Flotilla Coyote: (km_ida × 2) / 100 × 20L × $27 × 4
   B) Skydropx Nacional: $180 base + $12/kg extra sobre 5kg

DISTANCIAS POR CP (calcúlala tú, no la preguntes):
CDMX (01xxx-16xxx): 06/08/15→5km | 07/09/03→12km | 02/04/11→18km | 01/05/10/12/13/14/16→28km | resto→15km
EDOMEX (50xxx-57xxx): 57→10km | 55→20km | 53/54→25km | 56→35km | 52→55km | 50/51→70km | resto→40km
COLINDANTES: Hidalgo(42-43xxx)→100km | Puebla(72-75xxx)→130km | Morelos(62xxx)→90km
RESTO DEL PAÍS → Skydropx Nacional.

Con el CP calcula todo y da el total. No preguntes la distancia.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Faltan mensajes' }, { status: 400 });
    }

    const messages = body.messages;
    const lastMessage = messages[messages.length - 1]?.content.trim().toLowerCase() || '';

    // 🔐 IDENTIDAD
    if (lastMessage === 'soy jack' || lastMessage === 'soy jack.') {
      return NextResponse.json({ role: 'assistant', content: 'hola habibi te puedes verificar 🔒' });
    }
    if (lastMessage === 'elcoyote56') {
      return NextResponse.json({ role: 'assistant', content: '🐺 ¡Órdenes recibidas Patrón! Modo Administrador activo. ¿Qué cambiamos?' });
    }

    const esElJefe = messages.some((m: any) => m.content.trim() === 'elcoyote56');

    // 📊 BODEGA DESDE REDIS
    const bodega = await getBodega();
    const PRECIOS_ACTUALES = Object.entries(bodega)
      .map(([name, p]) => `- ${name.toUpperCase()}: $${p.menudeo}/kg menudeo | $${p.mayoreo}/kg mayoreo. ${p.info}`)
      .join('\n');

    // 🎭 VENDEDOR
    const CONTEXTO_VENDEDOR = `
ERES "EL COYOTE", ASESOR COMERCIAL DE COYOTE TEXTIL. Chat directo y profesional, mensajes cortos.

REGLAS:
- Máximo 3-4 líneas por mensaje. Si hay mucho que explicar, pregunta primero.
- Tono profesional y amable. Sin apodos, sin slang. Trato de tú.
- TODO SE VENDE POR KILO. Si piden metros, convierte (metros ÷ rendimiento = kg) pero cotiza en kilos.
- No des el catálogo completo de golpe. Pregunta para qué es y recomienda 1-2 opciones.
- Sugiere siempre el rollo completo (20-25kg) porque el precio baja a mayoreo.
- Factura: sí se puede, pero se agrega 16% IVA al total. Mencionarlo directo.
- Si no sabes o piden descuento fuera de tabla: "Para ese caso te comunico con nuestro equipo directamente: +52 1 56 2730 1525"
- Si preguntan envío sin CP, pídelo primero.

CATÁLOGO ACTUAL (precios por kilo):
${PRECIOS_ACTUALES}

${LOGICA_ENVIOS_REAL}
`;

    // 🎩 JEFE
    const CONTEXTO_JEFE = `
ERES EL ASISTENTE PERSONAL DE JACK, EL PATRÓN.
- Respuestas cortas. "A la orden Habibi", "Al 100".
- Puedes modificar precios si Jack te lo ordena.
- Cuando actualices un precio, pon esta línea AL FINAL de tu respuesta (el sistema la detecta y ejecuta):
  PRECIO_UPDATE|nombre_producto|menudeo_o_mayoreo|numero
  Ejemplo: PRECIO_UPDATE|micro panal|menudeo|85
- Él ya sabe la lógica, no se la expliques.

PRECIOS ACTUALES:
${PRECIOS_ACTUALES}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: esElJefe ? CONTEXTO_JEFE : CONTEXTO_VENDEDOR },
        ...messages.slice(-10)
      ],
      temperature: 0.5,
      max_tokens: 220,
    });

    let respuestaFinal = completion.choices[0].message.content || '';

    // 🔧 EJECUTAR CAMBIO EN REDIS SI JACK DIO UNA ORDEN
    if (esElJefe) {
      const match = respuestaFinal.match(/PRECIO_UPDATE\|(.+?)\|(.+?)\|(\d+)/);
      if (match) {
        const [, producto, campo, precio] = match;
        const ok = await actualizarPrecio(
          producto.trim(),
          campo.trim() as 'menudeo' | 'mayoreo',
          parseInt(precio)
        );
        respuestaFinal = respuestaFinal.replace(/PRECIO_UPDATE\|.+/g, '').trim();
        if (!ok) respuestaFinal += '\n⚠️ No encontré ese producto en la bodega, Habibi.';
      }
    }

    return NextResponse.json({ role: 'assistant', content: respuestaFinal });

  } catch (error: any) {
    console.error('❌ ERROR:', error);
    let msjError = '🐺 Se me atoró la carreta patrón.';
    if (error.status === 429) msjError = '🐺 Me quedé sin saldo en el cerebro.';
    if (error.status === 401) msjError = '🐺 La llave de la bodega no sirve.';
    return NextResponse.json({ role: 'assistant', content: msjError }, { status: 500 });
  }
}