const nextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
  },
  webpack(config) {
    if (config.cache) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

export default nextConfig;
