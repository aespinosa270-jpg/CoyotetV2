import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🐺 Inyectando clientes B2B de alto valor a la Bóveda...');

  const seedPassword = await bcrypt.hash('SeedClientes2025!', 10);

  // 1. Cliente Gold - Textiles del Norte
  await prisma.user.upsert({
    where: { email: 'compras@textilesnorte.com' },
    update: {},
    create: {
      hashId: 'CL-8839X',
      name: 'Textiles del Norte S.A.',
      email: 'compras@textilesnorte.com',
      password: seedPassword,
      phone: '5512345678',
      street: 'Av. Industrial 45',
      neighborhood: 'Vallejo',
      city: 'CDMX',
      state: 'CDMX',
      ltv: 24500.00,
      role: 'CLIENT',
      optedIn: true,
      orders: {
        create: [
          {
            orderNumber: 'CYT-9001',
            customerName: 'Textiles del Norte S.A.',
            customerEmail: 'compras@textilesnorte.com',
            customerPhone: '5512345678',
            address: 'Av. Industrial 45, Vallejo, CDMX',
            total: 24500.00,
            status: 'DELIVERED',
            logisticsType: 'SKYDROPX_NACIONAL',
            vehiclesNeeded: 1,
            items: {
              create: [
                // 🔥 Agregados productId y price
                { productId: 'prod_polar', title: 'Polar', quantity: 2, unit: 'Rollo', color: 'Vino', price: 85.00 },
                { productId: 'prod_flanel', title: 'Flanel', quantity: 1, unit: 'Rollo', color: 'Marino', price: 90.00 }
              ]
            }
          }
        ]
      }
    }
  });

  // 2. Cliente Frecuente - Confecciones Martínez
  await prisma.user.upsert({
    where: { email: 'contacto@confeccionesmtz.com' },
    update: {},
    create: {
      hashId: 'CL-9921M',
      name: 'Confecciones Martínez',
      email: 'contacto@confeccionesmtz.com',
      password: seedPassword,
      phone: '3398765432',
      street: 'Calle Benito Juárez 12',
      neighborhood: 'Centro',
      city: 'Guadalajara',
      state: 'Jalisco',
      ltv: 8500.00,
      role: 'CLIENT',
      optedIn: true,
      orders: {
        create: [
          {
            orderNumber: 'CYT-9002',
            customerName: 'Confecciones Martínez',
            customerEmail: 'contacto@confeccionesmtz.com',
            customerPhone: '3398765432',
            address: 'Calle Benito Juárez 12, Centro, Guadalajara',
            total: 8500.00,
            status: 'SHIPPED',
            logisticsType: 'SKYDROPX_NACIONAL',
            vehiclesNeeded: 1,
            items: {
              create: [
                // 🔥 Agregados productId y price
                { productId: 'lycra_metalica', title: 'Lycra Metálica', quantity: 50, unit: 'Metro', color: 'Oro Metálico', price: 40.00 },
                { productId: 'prod_felpa_china', title: 'Felpa China', quantity: 1, unit: 'Rollo', color: 'Negro', price: 100.00 }
              ]
            }
          }
        ]
      }
    }
  });

  // 3. Cliente Táctico - Seguridad Alfa
  await prisma.user.upsert({
    where: { email: 'proveedores@seguridadalfa.com' },
    update: {},
    create: {
      hashId: 'CL-7742A',
      name: 'Seguridad Privada Alfa',
      email: 'proveedores@seguridadalfa.com',
      password: seedPassword,
      phone: '8111223344',
      street: 'Blvd. Constitución 100',
      neighborhood: 'San Jerónimo',
      city: 'Monterrey',
      state: 'Nuevo León',
      ltv: 11000.00,
      role: 'CLIENT',
      optedIn: true,
      orders: {
        create: [
          {
            orderNumber: 'CYT-9003',
            customerName: 'Seguridad Privada Alfa',
            customerEmail: 'proveedores@seguridadalfa.com',
            customerPhone: '8111223344',
            address: 'Blvd. Constitución 100, San Jerónimo, Monterrey',
            total: 11000.00,
            status: 'PROCESSING',
            logisticsType: 'COYOTE_LOCAL',
            vehiclesNeeded: 0,
            items: {
              create: [
                // 🔥 Agregados productId y price
                { productId: 'prod_diablo', title: 'Diablo', quantity: 4, unit: 'Rollo', color: 'Negro', price: 55.00 }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('✅ ¡BÓVEDA LLENA! Cartera de clientes inyectada con éxito.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error inyectando clientes:', e);
    await prisma.$disconnect();
    process.exit(1);
  });