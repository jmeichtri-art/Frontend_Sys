/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite compilar a otra carpeta (NEXT_DIST_DIR=.next-check next build) sin pisar el
  // .next que está sirviendo el dev server, que si no queda pidiendo chunks que ya no existen.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
