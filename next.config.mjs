/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow native modules to run server-side
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
