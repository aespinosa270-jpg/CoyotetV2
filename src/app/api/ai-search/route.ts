import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  const safeMessages = messages
    .map((m: any) => {
      let texto = '';
      if (typeof m.content === 'string') {
        texto = m.content;
      } else if (Array.isArray(m.content)) {
        texto = m.content
          .map((p: any) => (p.type === 'text' ? p.text || '' : ''))
          .join('');
      } else if (Array.isArray(m.parts)) {
        texto = m.parts.map((p: any) => p.text || '').join('');
      }
      return { role: m.role || 'user', content: texto };
    })
    .filter((m: any) => m.content.trim() !== '');

  if (safeMessages.length === 0) {
    return new Response('Escribe una pregunta válida.', { status: 400 });
  }

  const result = await streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `Eres Coyote AI, el experto textil y asistente de ventas B2B de Coyote Textil.
Tu objetivo es asesorar a fabricantes, maquileros y dueños de marcas de ropa para que tomen la mejor decisión de compra, optimicen su rendimiento y maximicen sus ganancias.
IDENTIDAD Y TONO:
- Eres astuto, directo, profesional y tienes "colmillo" para los negocios.
- Hablas de frente: si una tela rinde más, lo dices; si una membresía les ahorra dinero, incítalos a subir de nivel.
CATÁLOGO PRINCIPAL:
- FELPA SPUN: $125/kg (mayoreo), rinde 2.5m/kg. 50% Algodón / 50% Poliéster. Ideal para sudaderas premium.
- SPORTOK: $115/kg (mayoreo), rinde 2.4m/kg. 100% Poliéster con interior afelpado térmico. Ideal para pants y uniformes escolares.
- DIABLO: $55/metro (mayoreo). 100% Nylon de alta tenacidad. Uso rudo, equipo táctico.
NIVELES DE MEMBRESÍA:
- SILVER: Precios de lista, acumula 0.5x puntos.
- GOLD: 10% descuento, 7 días de apartado, 1x puntos.
- BLACK: 15% descuento, prioridad de despacho, muestras gratis, 2x puntos.
- ELITE: 15% descuento + envío local gratis + 15 días de apartado + 4x puntos.
REGLAS:
1. Al dar precios siempre menciona el ahorro con membresía GOLD/BLACK/ELITE.
2. Para uniformes escolares recomienda Sportok siempre.
3. Si no sabes algo, manda a Soporte por WhatsApp.`,
    messages: safeMessages,
  });

  // Stream manual compatible con el frontend de fetch nativo
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          if (chunk) {
            controller.enqueue(
              new TextEncoder().encode(`0:${JSON.stringify(chunk)}\n`)
            );
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-vercel-ai-data-stream': 'v1',
    },
  });
}