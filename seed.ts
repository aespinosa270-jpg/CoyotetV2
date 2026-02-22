import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Usamos bcryptjs porque es el que está en tu API

const prisma = new PrismaClient();

async function main() {
  console.log('🐺 Forjando credenciales para Valeria...');
  
  // 1. Encriptamos la contraseña
  const hashedPassword = await bcrypt.hash('coyote01', 10);
  
  // 2. Usamos prisma.employee (¡La tabla correcta!)
  const empleado = await prisma.employee.upsert({
    where: { email: 'valeria@coyotetextil.com' },
    update: {
      password: hashedPassword,
      isActive: true, // ¡Vital! Tu API exige que esté activa
    },
    create: {
      email: 'valeria@coyotetextil.com',
      name: 'Valeria', 
      password: hashedPassword,
      role: 'ADMIN', // Asegúrate de que este rol exista en tu schema (puede ser 'ADMIN', 'VENDEDOR', 'black', etc.)
      isActive: true,
    },
  });
  
  console.log('✅ ¡Misión cumplida! El empleado ha sido registrado exitosamente.');
  console.log(`👤 Usuario: ${empleado.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error de sistema:', e);
    await prisma.$disconnect();
    process.exit(1);
  });