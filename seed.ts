const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('123456', 10) // Tu contraseña real aquí
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@coyote.com' },
    update: {},
    create: {
      email: 'admin@coyote.com',
      name: 'Admin Coyote',
      password: password,
      role: 'black', // Rol máximo
    },
  })
  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })