import { describe, expect, it } from 'vitest';

import { createNextConfig } from '../../next.config';

describe('next config', () => {
  it('leaves vote API authentication to the server-side route handler', () => {
    const nextConfig = createNextConfig();

    expect(nextConfig.rewrites).toBeUndefined();
  });
});
