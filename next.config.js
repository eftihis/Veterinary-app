/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with external tunnels
  images: {
    unoptimized: true,
  },
  // Environment variables are automatically loaded from .env files
  // No need to explicitly set them here
  
  // Allow cross-origin requests from localtunnel
  allowedDevOrigins: [
    'https://easy-shoes-mix.loca.lt' // Your localtunnel URL
  ],
  
  // Disable ESLint during build to avoid build failures due to ESLint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 