import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const choferes = [
    { name: "Frank", email: "frank@coyotetextil.com", pass: "Cuba2026" },
    { name: "Lalo", email: "lalo@coyotetextil.com", pass: "Peru2026" },
    { name: "Carlos", email: "carlos@coyotetextil.com", pass: "Venezuela2026" },
  ];

  const saltRounds = 12;

  console.log("🚛 Actualizando matriz de acceso para Coyote Logística...");

  for (const datos of choferes) {
    try {
      const hashedPassword = await bcrypt.hash(datos.pass, saltRounds);

      const empleado = await prisma.employee.upsert({
        where: { email: datos.email.toLowerCase() },
        update: {
          password: hashedPassword,
          role: "LOGISTICA",
          isActive: true,
        },
        create: {
          name: datos.name,
          email: datos.email.toLowerCase(),
          password: hashedPassword,
          role: "LOGISTICA",
          isActive: true,
        },
      });

      console.log(`✅ ${empleado.name} (${empleado.email}) sincronizado con su nueva contraseña.`);
    } catch (error) {
      console.error(`❌ Error en la asimilación de ${datos.email}:`, error);
    }
  }

  console.log("\n🏁 Protocolo completado. Las llaves de acceso están encriptadas y listas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });