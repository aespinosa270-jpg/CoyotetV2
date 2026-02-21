import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, email: true, password: true },
  });

  console.log(`Encontrados ${employees.length} empleados...`);

  for (const emp of employees) {
    if (emp.password.startsWith('$2b$') || emp.password.startsWith('$2a$')) {
      console.log(`  ⏭  ${emp.email} — ya hasheado, omitiendo`);
      continue;
    }

    const hashed = await bcrypt.hash(emp.password, 12);
    await prisma.employee.update({
      where: { id: emp.id },
      data: { password: hashed },
    });
    console.log(`  ✅  ${emp.email} — password hasheado`);
  }

  console.log('\nListo. Todos los passwords están seguros.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());