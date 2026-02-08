/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // 👈 ESTO ES LO NUEVO DE TAILWIND 4
  },
};

export default config;