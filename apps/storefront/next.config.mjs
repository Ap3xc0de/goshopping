/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@goshopping/storefront-sdk'],
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  images: {
    // next/image refuses any host that is not listed here, so product photos
    // need their bucket allowed explicitly or every card renders broken.
    // NEXT_PUBLIC_ASSETS_HOST carries the CDN/bucket host per environment;
    // localhost:4566 is LocalStack, used by the local docker-compose stack.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'http', hostname: 'localhost', port: '4566' },
      { protocol: 'http', hostname: '127.0.0.1', port: '4566' },
      ...(process.env.NEXT_PUBLIC_ASSETS_HOST
        ? [{ protocol: 'https', hostname: process.env.NEXT_PUBLIC_ASSETS_HOST }]
        : []),
    ],
  },
};

export default nextConfig;
