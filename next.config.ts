import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
 
  reactStrictMode: true,              // extra warnings in dev 

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'cdn.my‑assets.com' },
    ],
  },
  transpilePackages: ['@xyflow/react'], // bundle ESM deps without extra plugin
  typescript: {
    ignoreBuildErrors: false,        // turn to true only in emergencies
  },
  eslint: {
    ignoreDuringBuilds: false,       // keep CI red if lint fails
  },
  output: 'standalone',              // bundle node_modules for Docker deploy
 
}

export default nextConfig
