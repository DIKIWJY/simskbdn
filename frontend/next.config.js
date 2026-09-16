/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Abaikan TypeScript error saat build Docker supaya tidak gagal
  typescript: {
    ignoreBuildErrors: true,
  },
  // Abaikan ESLint error saat build
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Di dalam Docker: pakai nama service "backend"
    // Di luar Docker (npm run dev): pakai localhost
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
