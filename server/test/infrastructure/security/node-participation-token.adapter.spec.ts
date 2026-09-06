import { NodeParticipationTokenAdapter } from '../../../src/modules/participation/infrastructure/security/node-participation-token.adapter';

describe('NodeParticipationTokenAdapter', () => {
  it('issues unpredictable URL-safe credentials and exposes only a digest for storage', () => {
    const adapter = new NodeParticipationTokenAdapter();
    const first = adapter.issue();
    const second = adapter.issue();

    expect(first.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.digest).toBe(adapter.digest(first.rawToken));
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.digest).not.toContain(first.rawToken);
  });
});
