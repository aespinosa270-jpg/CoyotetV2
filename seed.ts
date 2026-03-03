import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ==========================================
  // 1. CREDENCIALES DE ACCESO (SEGURIDAD INDIVIDUAL)
  // ==========================================
  console.log('🔒 Forjando llaves maestras únicas para el equipo...');
  
  // 👑 LOS JEFES (ADMIN)
  // Nota: Estas son contraseñas temporales para el seed. 
  // Podrán cambiarlas después desde el sistema.
  const admins = [
    { email: 'jackrizk@coyotetextil.com', name: 'Jack Rizk', pass: 'JackCoyote2026!' },
    { email: 'stephanyrizk@coyotetextil.com', name: 'Stephany Rizk', pass: 'StephanyCoyote2026!' }
  ];

  for (const admin of admins) {
    // Hasheamos la contraseña ESPECÍFICA de este admin
    const hashedPassword = await bcrypt.hash(admin.pass, 10);

    await prisma.employee.upsert({
      where: { email: admin.email },
      update: { password: hashedPassword, isActive: true, role: 'ADMIN' },
      create: {
        email: admin.email,
        name: admin.name,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`👑 Admin listo: ${admin.name} | Pass temporal: ${admin.pass}`);
  }

  // 💼 LAS VENDEDORAS (Operación - Sin acceso a /admin)
  const vendedoras = [
    { email: 'valeria@coyotetextil.com', name: 'Valeria', pass: 'ValeriaVentas01' },
    { email: 'paula@coyotetextil.com', name: 'Paula', pass: 'PaulaVentas02' },
    { email: 'katia@coyotetextil.com', name: 'Katia', pass: 'KatiaVentas03' }
  ];

  for (const vendedora of vendedoras) {
    // Hasheamos la contraseña ESPECÍFICA de esta vendedora
    const hashedPassword = await bcrypt.hash(vendedora.pass, 10);

    await prisma.employee.upsert({
      where: { email: vendedora.email },
      update: { password: hashedPassword, isActive: true, role: 'VENDEDORA' },
      create: {
        email: vendedora.email,
        name: vendedora.name,
        password: hashedPassword,
        role: 'VENDEDORA',
        isActive: true,
      },
    });
    console.log(`✅ Vendedora en posición: ${vendedora.name} | Pass temporal: ${vendedora.pass}`);
  }