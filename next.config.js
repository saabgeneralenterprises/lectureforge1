/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk", "@google/generative-ai"],
  },
};

module.exports = nextConfig;
