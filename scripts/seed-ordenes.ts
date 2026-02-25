import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🐺 [COYOTE OS] Iniciando Simulador de Operaciones...");

  // 1. Localizar a los operativos en la base de datos
  const frank = await prisma.employee.findUnique({ where: { email: "frank@coyotetextil.com" } });
  const lalo = await prisma.employee.findUnique({ where: { email: "lalo@coyotetextil.com" } });
  const carlos = await prisma.employee.findUnique({ where: { email: "carlos@coyotetextil.com" } });

  if (!frank || !lalo || !carlos) {
    console.error("❌ Error: Faltan choferes. Ejecuta primero el seed-choferes.ts");
    return;
  }

  const ahora = new Date();
  const enDosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  const enCuatroHoras = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);

  // 2. Limpiar órdenes anteriores (Opcional, para no saturar pruebas)
  // await prisma.routeOrder.deleteMany({}); 

  console.log("📦 Generando misiones tácticas...");

  // MISION 1: Entrega a Domicilio normal (Asignada a FRANK)
  await prisma.routeOrder.create({
    data: {
      type: "ENTREGA_DOMICILIO",
      status: "ASIGNADA",
      contactName: "Sastrería El Buen Vestir",
      contactPhone: "5512345678",
      address: "Av. Pdte. Masaryk 123, Polanco, CDMX",
      addressLat: 19.4323, // Coordenada prueba
      addressLng: -99.1923,
      scheduledAt: enDosHoras,
      notes: "Cuidado al descargar, la entrada es estrecha.",
      assignedTo: frank.id,
      items: {
        create: [
          { tag: "CX-1001", description: "Rollo Lino Premium (50m)", qtyDispatched: 2 },
          { tag: "CX-1002", description: "Caja de Hilos Poliéster", qtyDispatched: 1 },
        ],
      },
    },
  });

  // MISION 2: Restock Interno entre bodegas (Asignada a FRANK)
  // Sirve para probar la UI de la flechita "Origen → Destino"
  await prisma.routeOrder.create({
    data: {
      type: "RESTOCK_INTERNO",
      status: "ASIGNADA",
      contactName: "Bodega Centro (Recepción)",
      contactPhone: "5550001111",
      address: "República de Guatemala 97, Centro Histórico, CDMX",
      originLocation: "PLOMO_203",
      destLocation: "GUATEMALA_97",
      scheduledAt: enCuatroHoras,
      assignedTo: frank.id,
      items: {
        create: [
          { tag: "BOD-991", description: "Tarima Mezclilla Azul", qtyDispatched: 10 },
        ],
      },
    },
  });

  // MISION 3: Drop-off en Paquetería (Asignada a LALO)
  await prisma.routeOrder.create({
    data: {
      type: "ENTREGA_PAQUETERIA",
      status: "ASIGNADA",
      contactName: "Sucursal FedEx Reforma",
      contactPhone: "5588889999",
      address: "Paseo de la Reforma 250, Juárez, CDMX",
      carrier: "FEDEX",
      sucursalNombre: "FedEx Reforma 250",
      scheduledAt: enDosHoras,
      assignedTo: lalo.id,
      items: {
        create: [
          { tag: "GUIA-7788", description: "Paquete a Monterrey", qtyDispatched: 1 },
          { tag: "GUIA-7789", description: "Paquete a Guadalajara", qtyDispatched: 1 },
        ],
      },
    },
  });

  // MISION 4: Recolección de Proveedor (Asignada a CARLOS)
  await prisma.routeOrder.create({
    data: {
      type: "RECOLECCION",
      status: "ASIGNADA",
      contactName: "Hilos y Estambres Nacionales",
      contactPhone: "5533334444",
      address: "Calle de Venustiano Carranza 100, Centro, CDMX",
      scheduledAt: enCuatroHoras,
      notes: "Preguntar por el Ing. Roberto. Llevar diablito.",
      assignedTo: carlos.id,
      items: {
        create: [
          { tag: "PROV-001", description: "Cajas de Muestra 2026", qtyDispatched: 5 },
        ],
      },
    },
  });

  console.log("✅ ¡Simulación inyectada con éxito! La flota tiene trabajo asignado.");
  console.log("🐺 Frank tiene 2 órdenes (Entrega y Restock).");
  console.log("🐺 Lalo tiene 1 orden (Drop-off FedEx).");
  console.log("🐺 Carlos tiene 1 orden (Recolección).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });