// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // <-- NIE przerywaj builda gdy ESLint znajduje błędy
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
