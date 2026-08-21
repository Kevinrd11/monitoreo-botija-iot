import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El proyecto es la raiz de Turbopack: evita que herede un lockfile externo.
  turbopack: { root: __dirname },
};

export default nextConfig;
