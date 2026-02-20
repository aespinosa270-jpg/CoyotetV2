// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // 1. LLAVE SECRETA (Para que nadie borre tu base de datos por accidente)
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== 'coyote2026') {
    return NextResponse.json({ error: 'Acceso Denegado. Se requiere llave de inyección.' }, { status: 401 });
  }

  try {
    console.log('🧹 Limpiando la base de datos...');
    // Borramos todo en cascada (primero dependencias, luego padres)
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.auditLog.deleteMany(); // Borramos logs viejos
    await prisma.employee.deleteMany(); // Borramos empleados viejos

    console.log('🛡️ Creando Operador B2B...');
    // ==========================================
    // CREACIÓN DEL EMPLEADO (TAQUIO)
    // ==========================================
    await prisma.employee.create({
      data: {
        name: 'Taquio',
        email: 'taquio@coyote.com',
        password: 'coyote2026', // En producción esto iría hasheado
        role: 'VENDEDORA',
        isActive: true
      }
    });

    console.log('🌱 Inyectando Clientes Corporativos...');
    
    // ==========================================
    // CREACIÓN DE 5 CLIENTES REALISTAS
    // ==========================================
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: 'Textiles Monterrey S.A. de C.V.', email: 'compras@textilesmty.com', password: 'hash_dummy',
          phone: '8112345678', role: 'black', ltv: 245000, optedIn: true,
          street: 'Av. Fundidora', neighborhood: 'Obrera', zipCode: '64010', city: 'Monterrey', state: 'Nuevo León'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Confecciones El Sol', email: 'direccion@elsolconf.com.mx', password: 'hash_dummy',
          phone: '5588776655', role: 'gold', ltv: 85000, optedIn: true,
          street: 'Calle Madero 12', neighborhood: 'Centro', zipCode: '06000', city: 'CDMX', state: 'Ciudad de México'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Deportivos Alpha', email: 'j.martinez@alpha-sports.com', password: 'hash_dummy',
          phone: '3311223344', role: 'silver', ltv: 12500, optedIn: false,
          street: 'Blvd. Atlixco 89', neighborhood: 'San José', zipCode: '72000', city: 'Puebla', state: 'Puebla'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Maquiladora Zeta', email: 'proveedores@zeta.com', password: 'hash_dummy',
          phone: '5599887766', role: 'black', ltv: 560000, optedIn: true,
          street: 'Av. Central 100', neighborhood: 'Vallejo', zipCode: '02300', city: 'CDMX', state: 'Ciudad de México'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Uniformes Escolares Omega', email: 'ventas@omegauniformes.mx', password: 'hash_dummy',
          phone: '5544332211', role: 'silver', ltv: 0, optedIn: true,
          street: 'Calle 5', neighborhood: 'Nezahualcóyotl', zipCode: '57000', city: 'Edomex', state: 'Estado de México'
        }
      })
    ]);

    console.log('📦 Fabricando Pedidos Históricos...');

    // ==========================================
    // CREACIÓN DE PEDIDOS (Con matemáticas reales)
    // ==========================================
    
    // Función helper para crear órdenes rápido
    const createMockOrder = async (
      userIndex: number, orderNum: string, status: any, logType: any, 
      subtotal: number, shipping: number, daysAgo: number, itemsData: any[]
    ) => {
      const user = users[userIndex];
      const iva = (subtotal + shipping + 175) * 0.16;
      const total = subtotal + shipping + 175 + iva;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      await prisma.order.create({
        data: {
          orderNumber: orderNum,
          userId: user.id,
          subtotal, freightCost: 0, shippingCost: shipping, serviceFee: 175, taxIVA: iva, total,
          status, logisticsType: logType, paymentMethod: 'card',
          customerName: user.name!, customerEmail: user.email, customerPhone: user.phone,
          address: `${user.street}, ${user.neighborhood}, CP ${user.zipCode}, ${user.city}`,
          createdAt: date,
          items: {
            create: itemsData
          }
        }
      });
    };

    // Pedido 1: Monterrey (Nacional, Pagado, Grande)
    await createMockOrder(0, 'CYT-1001', 'PAID', 'SKYDROPX_NACIONAL', 45000, 3200, 2, [
      { productId: 'prod_1', title: 'Felpa Deportiva Premium', price: 150, quantity: 200, unit: 'KG', color: 'Negro Azabache' },
      { productId: 'prod_2', title: 'Poliéster Dry-Fit', price: 100, quantity: 150, unit: 'KG', color: 'Blanco Nieve' }
    ]);

    // Pedido 2: CDMX (Local Coyote, Enviado)
    await createMockOrder(1, 'CYT-1002', 'SHIPPED', 'COYOTE_LOCAL', 22000, 500, 1, [
      { productId: 'prod_3', title: 'Lycra Sublimable', price: 220, quantity: 100, unit: 'KG', color: 'Neón' }
    ]);

    // Pedido 3: Puebla (Nacional, Pendiente de OXXO)
    await createMockOrder(2, 'CYT-1003', 'PENDING', 'SKYDROPX_NACIONAL', 8500, 850, 0, [
      { productId: 'prod_1', title: 'Felpa Deportiva Premium', price: 170, quantity: 50, unit: 'KG', color: 'Rojo Carmesí' }
    ]);

    // Pedido 4: Vallejo CDMX (Local Coyote, Entregado, Muy Grande)
    await createMockOrder(3, 'CYT-1004', 'DELIVERED', 'COYOTE_LOCAL', 115000, 800, 15, [
      { productId: 'prod_4', title: 'Algodón Peinado 24/1', price: 230, quantity: 500, unit: 'KG', color: 'Gris Jaspe' }
    ]);

    // Pedido 5: Neza (Local Coyote, En Proceso)
    await createMockOrder(4, 'CYT-1005', 'PROCESSING', 'COYOTE_LOCAL', 15000, 300, 0, [
      { productId: 'prod_5', title: 'Tela Piqué Escolar', price: 150, quantity: 100, unit: 'KG', color: 'Azul Marino' }
    ]);

    // Pedido 6: Monterrey Histórico (Para que tenga historial en el CRM)
    await createMockOrder(0, 'CYT-0899', 'DELIVERED', 'SKYDROPX_NACIONAL', 85000, 4100, 45, [
      { productId: 'prod_2', title: 'Poliéster Dry-Fit', price: 100, quantity: 850, unit: 'KG', color: 'Negro' }
    ]);

    console.log('✅ Inyección completada con éxito.');

    return NextResponse.json({ 
      success: true, 
      message: 'Base de datos poblada con Taquio al mando. ¡Ve al login!',
      clientes_inyectados: 5,
      pedidos_inyectados: 6
    });

  } catch (error: any) {
    console.error('Error inyectando datos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}