// seed-empleado.mjs
// Crea una vendedora REAL en la tabla Employee de la RDS.
// Uso:  node seed-empleado.mjs "Katy Torres" katy@coyotetextil.com TuPassword123 VENDEDORA
// Roles válidos: ADMIN, SUPERVISOR, VENDEDORA, LOGISTICA, CONTABILIDAD

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const [nombre, email, password, rol = 'VENDEDORA'] = process.argv.slice(2);

if (!nombre || !email || !password) {
  console.log('Uso: node seed-empleado.mjs "Nombre Apellido" correo@dominio.com Password123 [ROL]');
  process.exit(1);
}

const prisma = new PrismaClient();

const hash = await bcrypt.hash(password, 10);

const emp = await prisma.employee.upsert({
  where: { email: email.toLowerCase().trim() },
  update: { name: nombre, password: hash, role: rol, isActive: true, isBlocked: false },
  create: {
    name: nombre,
    email: email.toLowerCase().trim(),
    password: hash,
    role: rol,
  },
});

console.log(`✅ Empleado listo: ${emp.name} (${emp.email}) · rol ${emp.role} · id ${emp.id}`);
await prisma.$disconnect();
