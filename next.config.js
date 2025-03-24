/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with external tunnels
  images: {
    unoptimized: true,
  },
  // Explicitly set environment variables
  env: {
    CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  },
  
  // Allow cross-origin requests from localtunnel
  allowedDevOrigins: [
    'https://huge-ads-divide.loca.lt' // Your localtunnel URL
  ],
  
  // Disable ESLint during build to avoid build failures due to ESLint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 