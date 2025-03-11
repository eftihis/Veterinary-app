/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with ngrok
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
