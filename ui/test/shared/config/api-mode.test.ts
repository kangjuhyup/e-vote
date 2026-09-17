import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveApiMode } from '@/shared/config/api-mode';

describe('resolveApiMode', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects mock authentication in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => resolveApiMode('mock')).toThrow(
      'NEXT_PUBLIC_VOTE_API_MODE=mock is development-only',
    );
    expect(resolveApiMode('live')).toBe('live');
  });
});
