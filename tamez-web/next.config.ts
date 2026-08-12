import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No exponer la tecnología del servidor.
  poweredByHeader: false,
  images: {
    // Formatos modernos primero (brief §10 — rendimiento).
    formats: ['image/avif', 'image/webp'],
    // Cuando el cliente entregue fotografía real alojada fuera del repo,
    // añadir aquí los hosts permitidos:
    // remotePatterns: [{ protocol: 'https', hostname: 'cdn.ejemplo.com' }],
  },
  // Cabeceras de seguridad básicas. Netlify las respeta a través del runtime.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
