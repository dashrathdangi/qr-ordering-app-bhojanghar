/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  env: {
    SECRET_KEY: process.env.SECRET_KEY,
  },
  webpack(config) {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'pg-native': false,
    };
    return config;
  },
};

export default nextConfig;
