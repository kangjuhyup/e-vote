import { describe, expect, it } from 'vitest';
import path from 'node:path';

import { createNextConfig } from '../../next.config';

describe('next config', () => {
  it('leaves vote API authentication to the server-side route handler', () => {
    const nextConfig = createNextConfig();

    expect(nextConfig.rewrites).toBeUndefined();
    expect(nextConfig.output).toBe('standalone');
    expect(nextConfig.outputFileTracingRoot).toBe(path.resolve(process.cwd(), '..'));
  });
});
