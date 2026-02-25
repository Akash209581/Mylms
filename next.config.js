/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Skip build errors for dynamic pages that can't be prerendered
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // This tells Next.js to skip failed page prerenders
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
