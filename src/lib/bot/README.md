# Coyote Bot v2

Sistema de ventas conversacional multi-canal para Coyote Textil.

Reemplaza progresivamente el webhook monolítico actual (`src/app/api/whatsapp/webhook/route.ts`) por una arquitectura modular, testeable y multi-canal.

## Filosofía

**El cerebro no sabe en qué canal está**. WhatsApp, Instagram, Telegram y web chat son adaptadores que traducen mensajes al formato universal `IncomingMessage` y reciben de vuelta `OutgoingMessage`. El orquestador trabaja con esos tipos y nada más.

**La inteligencia está separada del transporte**. El motor de tácticas, el RAG sobre catálogo y el manejador de objeciones viven en `intelligence/`. No tienen idea de cómo llegan los mensajes ni cómo se entregan.

**Function calling, no comandos parseados**. GPT-4o invoca funciones con argumentos tipados (validados por JSON Schema). No más regex frágiles tipo `GENERAR_COBRO|tarjeta|2857.00|NONE|NONE|...`.

**Feature flag, no big-bang**. El v1 sigue corriendo. El v2 se enciende por teléfono o por porcentaje vía variables de entorno. Rollback en segundos.

## Estructura

```
src/lib/bot/
├── config/              Variables de entorno + constantes
├── core/                Orquestador puro (no sabe del canal)
├── transports/          Adaptadores: whatsapp, instagram, telegram, web, stripe
├── services/            Clientes externos: openai, stripe, facturapi, meta, vector
├── repositories/        Acceso a Redis y Prisma
├── domain/              Lógica de negocio pura (testeable sin red)
│   ├── catalog/         Telas, hilos, elásticos
│   ├── profile/         Perfil del cliente, segmentación
│   ├── shipping/        Cálculo de flete, zonas
│   ├── payments/        Stripe, SPEI, facturación
│   ├── sales/           Tácticas, temperatura, cross-sell
│   └── membership/      Gold/Black/Elite
├── intelligence/        Capa de IA
│   ├── intent/          Clasificador de intención
│   ├── memory/          Corto, largo y episódico
│   ├── rag/             Indexador + retriever sobre catálogo
│   ├── vision/          Análisis de fotos de telas
│   └── prompts/         Plantillas de prompts (separadas)
├── tools/               Function calling handlers
├── guards/              Rate limit, dedupe, privacy, PII
├── postprocessing/      Sanitizadores de respuesta
├── handoff/             Transferencia a humano
├── observability/       Logs, métricas, traces
├── admin/               Modo Jack (comandos en chat + API admin)
├── jobs/                Cron jobs
├── lib/                 Utilidades (phone, currency, retry)
├── types/               Tipos compartidos
└── __tests__/           Tests unit, integration, e2e
```

## Reglas duras

1. **Runtime Node, nunca Edge**. Todas las rutas API que importen este módulo deben tener `export const runtime = 'nodejs';`. Edge no soporta `Buffer`, ni varias libs que usamos (pino, prisma).
2. **Nunca importar de `app/` desde `lib/bot/`**. El bot vive solo en lib. Los webhooks en `app/api/` importan del bot, no al revés.
3. **Validar entrada en el borde**. Todo `IncomingMessage` se valida con zod antes de entrar al orquestador.
4. **Logs estructurados**. Cero `console.log`. Todo pasa por el logger de `observability/logger.ts` con contexto (`conversationId`, `phone`, `channel`, `step`).
5. **Tests para todo lo de `domain/`**. Es lógica pura, no hay excusa. Cobertura mínima: 80%.

## Migración: feature flags

Las variables que controlan el rollout viven en `.env`:

```bash
BOT_V2_ENABLED=false           # apagado completo
BOT_V2_PHONES=521xxx,521yyy    # whitelist de teléfonos
BOT_V2_PERCENTAGE=0             # % de tráfico al v2
```

El webhook actual chequea estas variables y enruta:
- Si el teléfono está en `BOT_V2_PHONES` → siempre v2.
- Si no, hash del teléfono mod 100 < `BOT_V2_PERCENTAGE` → v2.
- Si no, v1 (el código actual sigue intacto).

## Fases

| # | Entrega | Estado |
|---|---------|--------|
| 0 | Cimientos: env, logger, tipos, vitest, README | en curso |
| 1 | Repositories + domain models | pendiente |
| 2 | Services externos (openai, stripe, facturapi, meta) | pendiente |
| 3 | Tools + orquestador básico | pendiente |
| 4 | Transport WhatsApp + Stripe (primer despliegue v2) | pendiente |
| 5 | Inteligencia (tácticas, objeciones, memoria) | pendiente |
| 6 | RAG sobre catálogo (pgvector) | pendiente |
| 7 | Vision (fotos de telas) | pendiente |
| 8 | Páginas admin para el bot en `/crm/admin/bot/` | pendiente |
| 9 | Multi-canal (Instagram, Telegram, web) | pendiente |
| 10 | Observabilidad + jobs cron | pendiente |

## Cómo correr los tests

```bash
npm run test              # corre todos los tests
npm run test:watch        # modo watch
npm run test:coverage     # con reporte de cobertura
npm run test -- domain    # solo tests de domain/
```

## Cómo agregar un canal nuevo

1. Crear `transports/<canal>/adapter.ts` que exporta `parseIncoming(payload) → IncomingMessage` y `sendOutgoing(msg) → DeliveryResult`.
2. Crear `app/api/webhooks/<canal>/route.ts` que recibe el webhook, verifica la firma y llama al orquestador.
3. Listo. El cerebro no se entera del nuevo canal.

## Cómo agregar una tool nueva

1. Definir el JSON Schema en `tools/definitions.ts`.
2. Crear `tools/handlers/<nombre>.ts` con el handler tipado.
3. Registrar en `tools/executor.ts`.
4. Agregar tests en `__tests__/tools/<nombre>.test.ts`.

GPT-4o la descubre y la invoca automáticamente cuando aplica.