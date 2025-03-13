/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with ngrok
  images: {
    unoptimized: true,
  },
  // Environment variables are automatically loaded from .env files
  // No need to explicitly set them here
};

module.exports = nextConfig; 