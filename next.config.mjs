/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'pdf-parse', 'tesseract.js', 'multer', 'xlsx', 'bcryptjs', 'express'],
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false, child_process: false };
    if (isServer) {
      if (Array.isArray(config.externals)) {
        config.externals.push('pdf-parse', 'sqlite3', 'tesseract.js', 'multer', 'xlsx', 'bcryptjs', 'express');
      } else {
        config.externals = [config.externals, 'pdf-parse', 'sqlite3', 'tesseract.js', 'multer', 'xlsx', 'bcryptjs', 'express'].filter(Boolean);
      }
    }
    return config;
  },
};

export default nextConfig;
