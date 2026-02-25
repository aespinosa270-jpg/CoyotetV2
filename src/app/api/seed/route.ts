// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 🐺 Mejor usar tu instancia global de Prisma
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  // 1. LLAVE SECRETA (Para que nadie borre tu base de datos por accidente)
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== 'coyote2026') {
    return NextResponse.json({ error: 'Acceso Denegado. Se requiere llave de inyección.' }, { status: 401 });
  }

  try {
    console.log('🧹 Limpiando la base de datos...');
    
    // Borramos todo en cascada respetando las relaciones (Cuidado, esto borra TODO)
    await prisma.orderItem.deleteMany();
    await prisma.ticket.deleteMany();       // Limpiamos quejas
    await prisma.interaction.deleteMany();  // Limpiamos historial CRM
    await prisma.attendance.deleteMany();   // Limpiamos horarios
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.employee.deleteMany(); 

    console.log('🛡️ Encriptando contraseñas...');
    // Generamos los hashes seguros para que NextAuth los pueda leer sin problema
    const genericHash = await bcrypt.hash('hash_dummy', 10);
    const taquioHash = await bcrypt.hash('coyote2026', 10);
    const adminHash = await bcrypt.hash('patron123', 10);
    const choferHash = await bcrypt.hash('flotilla123', 10);

    console.log('🐺 Creando Cuentas de Personal (Coyote Team)...');
    
    // ==========================================
    // CREACIÓN DEL EQUIPO (Admin, Ventas, Flotilla)
    // ==========================================
    await Promise.all([
      // El Patrón
      prisma.employee.create({
        data: { name: 'Admin Coyote', email: 'admin@coyote.com', password: adminHash, role: 'ADMIN', isActive: true }
      }),
      // Operador de Flotilla
      prisma.employee.create({
        data: { name: 'Chofer Lobo', email: 'chofer@coyote.com', password: choferHash, role: 'LOGISTICA', isActive: true }
      }),
      // Taquio (Ventas)
      prisma.employee.create({
        data: { name: 'Taquio', email: 'taquio@coyote.com', password: taquioHash, role: 'VENDEDORA', isActive: true }
      })
    ]);

    console.log('🌱 Inyectando Clientes Corporativos...');
    
    // ==========================================
    // CREACIÓN DE 5 CLIENTES REALISTAS (B2B)
    // ==========================================
    // Nota: Como tus roles son enums (MembershipTier), usamos los valores correctos (NONE, GOLD, BLACK, ELITE)
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: 'Textiles Monterrey S.A. de C.V.', email: 'compras@textilesmty.com', password: genericHash,
          phone: '8112345678', membershipTier: 'BLACK', ltv: 245000, optedIn: true,
          street: 'Av. Fundidora', neighborhood: 'Obrera', zipCode: '64010', city: 'Monterrey', state: 'Nuevo León'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Confecciones El Sol', email: 'direccion@elsolconf.com.mx', password: genericHash,
          phone: '5588776655', membershipTier: 'GOLD', ltv: 85000, optedIn: true,
          street: 'Calle Madero 12', neighborhood: 'Centro', zipCode: '06000', city: 'CDMX', state: 'Ciudad de México'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Deportivos Alpha', email: 'j.martinez@alpha-sports.com', password: genericHash,
          phone: '3311223344', membershipTier: 'NONE', ltv: 12500, optedIn: false,
          street: 'Blvd. Atlixco 89', neighborhood: 'San José', zipCode: '72000', city: 'Puebla', state: 'Puebla'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Maquiladora Zeta', email: 'proveedores@zeta.com', password: genericHash,
          phone: '5599887766', membershipTier: 'ELITE', ltv: 560000, optedIn: true,
          street: 'Av. Central 100', neighborhood: 'Vallejo', zipCode: '02300', city: 'CDMX', state: 'Ciudad de México'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Uniformes Escolares Omega', email: 'ventas@omegauniformes.mx', password: genericHash,
          phone: '5544332211', membershipTier: 'NONE', ltv: 0, optedIn: true,
          street: 'Calle 5', neighborhood: 'Nezahualcóyotl', zipCode: '57000', city: 'Edomex', state: 'Estado de México'
        }
      })
    ]);

    console.log('📦 Fabricando Pedidos Históricos...');

    // ==========================================
    // CREACIÓN DE PEDIDOS (Con matemáticas reales)
    // ==========================================
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
          updatedAt: date,
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

    // Pedido 2: CDMX (Local Coyote, Enviado - ESTE LO VERÁ EL CHOFER EN SU APP)
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

    // Pedido 5: Neza (Local Coyote, En Proceso - ARMANDO EN ALMACÉN)
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
      message: 'Base de datos poblada. Cuentas maestras creadas. ¡Ve al login!',
      credenciales_maestras: [
        { rol: 'ADMIN', email: 'admin@coyote.com', pass: 'patron123' },
        { rol: 'LOGISTICA', email: 'chofer@coyote.com', pass: 'flotilla123' },
        { rol: 'VENDEDORA', email: 'taquio@coyote.com', pass: 'coyote2026' }
      ],
      clientes_inyectados: 5,
      pedidos_inyectados: 6
    });

  } catch (error: any) {
    console.error('Error inyectando datos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}