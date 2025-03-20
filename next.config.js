/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with ngrok
  images: {
    unoptimized: true,
  },
  // Environment variables are automatically loaded from .env files
  // No need to explicitly set them here
  
  // Allow cross-origin requests from ngrok
  allowedDevOrigins: [
    'https://00f7-2a02-587-c41f-ed7a-8e8-9568-1ffe-8338.ngrok-free.app'
  ],
};

module.exports = nextConfig; 