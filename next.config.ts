/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with localtunnel
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
