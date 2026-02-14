import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prismaSeedClient = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('123', 10)

  // 1. Crear Distribuidor (Black)
  await prismaSeedClient.user.upsert({
    where: { email: 'admin@coyote.com' },
    update: {},
    create: {
      email: 'admin@coyote.com',
      name: 'Jefe Coyote',
      password: passwordHash,
      role: 'black',
    },
  })

  // 2. Crear Socio (Gold)
  await prismaSeedClient.user.upsert({
    where: { email: 'socio@coyote.com' },
    update: {},
    create: {
      email: 'socio@coyote.com',
      name: 'Cliente Gold',
      password: passwordHash,
      role: 'gold',
    },
  })

  console.log("🌱 Semilla ejecutada con éxito")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaSeedClient.$disconnect()
  })