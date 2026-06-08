import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['reactflow'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  cacheComponents: true
};

export default nextConfig;
