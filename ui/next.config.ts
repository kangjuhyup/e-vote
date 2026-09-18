import type { NextConfig } from 'next';
import path from 'node:path';

export function createNextConfig(): NextConfig {
  return {
    output: 'standalone',
    outputFileTracingRoot: path.resolve(process.cwd(), '..'),
  };
}

const nextConfig = createNextConfig();

export default nextConfig;
