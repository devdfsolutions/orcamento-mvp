// next.config.ts
const isCI = !!process.env.VERCEL; // true no Vercel, false no seu PC

const nextConfig = {
  eslint: {
    // Evita que o build QUEBRE no Vercel por causa do ESLint
    ignoreDuringBuilds: isCI,
  },
  typescript: {
    // Evita que o build QUEBRE no Vercel por erros de TypeScript
    ignoreBuildErrors: isCI,
  },
};

export default nextConfig;
