// prisma.config.js
require('dotenv').config();

module.exports = {
  // Ruta relativa simple al archivo schema
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};