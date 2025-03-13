/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for development with ngrok
  images: {
    unoptimized: true,
  },
  // Ensure environment variables are loaded
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig; 