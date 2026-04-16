import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Only bundle the specific exports used from these packages — reduces bundle size significantly
    // lucide-react alone has 1000+ icons; optimizePackageImports ensures unused ones are tree-shaken
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
  },
};

export default nextConfig;
