// scripts/seed-mapa.ts
// Corre con: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-mapa.ts
// O simplemente pega el contenido en la Consola SQL de Supabase

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos de prueba para el mapa...");

  // ── 1. Usuario de prueba ─────────────────────────────────────────────────
  const usuario = await prisma.user.upsert({
    where: { email: "cliente.prueba@coyote.com" },
    update: {},
    create: {
      email: "cliente.prueba@coyote.com",
      name: "Cliente Demo",
      password: "hash_no_importa",
      role: "USER",
    },
  });
  console.log("✅ Usuario:", usuario.email);

  // ── 2. Empleado / Chofer de prueba ───────────────────────────────────────
  const chofer = await prisma.employee.upsert({
    where: { email: "chofer.demo@coyote.com" },
    update: {},
    create: {
      email: "chofer.demo@coyote.com",
      name: "Juan Coyote (Demo)",
      password: "hash_no_importa",
      role: "LOGISTICA",
      isActive: true,
    },
  });
  console.log("✅ Chofer:", chofer.name);

  // ── 3. Órdenes activas con coordenadas reales de CDMX ───────────────────
  const paradas = [
    {
      customerName: "Maquiladora Estrella S.A.",
      address: "Mercado de Telas, Centro Histórico, CDMX",
      deliveryLat: 19.4284,
      deliveryLng: -99.1276,
      status: "SHIPPED" as const,
    },
    {
      customerName: "Confecciones Hernández",
      address: "Tepito, Venustiano Carranza, CDMX",
      deliveryLat: 19.4401,
      deliveryLng: -99.1178,
      status: "PROCESSING" as const,
    },
    {
      customerName: "Uniformes Peñón",
      address: "Peñón de los Baños, CDMX",
      deliveryLat: 19.4351,
      deliveryLng: -99.0891,
      status: "PAID" as const,
    },
  ];

  for (const parada of paradas) {
    const orden = await prisma.order.create({
      data: {
        userId: usuario.id,
        total: 2500,
        subtotal: 2155,
        taxIVA: 345,
        status: parada.status,
        logisticsType: "COYOTE_LOCAL",
        pickupLocation: "GUATEMALA_97",
        customerName: parada.customerName,
        customerEmail: "cliente.prueba@coyote.com",
        customerPhone: "5555555555",
        address: parada.address,
        deliveryLat: parada.deliveryLat,
        deliveryLng: parada.deliveryLng,
        items: {
          create: {
            productId: "PROD-DEMO",
            title: "Sportok 100% Poliéster",
            sku: "SPK-001",
            price: 115,
            quantity: 25,
            unit: "kg",
          },
        },
      },
    });
    console.log(`✅ Orden creada: ${parada.customerName} → ${orden.id}`);
  }

  // ── 4. Telemetría del chofer en ruta (posición actual simulada) ──────────
  // Ruta simulada: va desde Guatemala 97 hacia Tepito
  const puntosRuta = [
    { lat: 19.4330, lng: -99.1365, speed: 35, isSpeeding: false }, // Guatemala 97 (origen)
    { lat: 19.4320, lng: -99.1310, speed: 42, isSpeeding: false },
    { lat: 19.4305, lng: -99.1255, speed: 88, isSpeeding: true  }, // ⚠️ Exceso de velocidad
    { lat: 19.4350, lng: -99.1210, speed: 55, isSpeeding: false },
    { lat: 19.4390, lng: -99.1190, speed: 30, isSpeeding: false }, // Cerca de destino
  ];

  // Insertar con timestamps escalonados (últimos 10 min)
  for (let i = 0; i < puntosRuta.length; i++) {
    const punto = puntosRuta[i];
    const minutosAtras = (puntosRuta.length - 1 - i) * 2; // cada 2 min
    await prisma.telemetry.create({
      data: {
        employeeId: chofer.id,
        lat: punto.lat,
        lng: punto.lng,
        speed: punto.speed,
        isSpeeding: punto.isSpeeding,
        timestamp: new Date(Date.now() - minutosAtras * 60 * 1000),
      },
    });
  }
  console.log(`✅ ${puntosRuta.length} puntos de telemetría creados para ${chofer.name}`);
  console.log("⚠️  Uno de ellos tiene isSpeeding:true → el radar debería activarse");

  console.log("\n🎉 Seed completo. Ve a /flotilla/mapa para ver el resultado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });