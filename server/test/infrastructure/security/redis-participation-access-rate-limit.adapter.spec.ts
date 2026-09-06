import type { RedisClient } from '../../../src/platform/redis/redis.constants';
import {
  ParticipationAccessRateLimitExceededError,
  ParticipationAccessRateLimitUnavailableError,
} from '../../../src/modules/participation/application/port/security/participation-access-rate-limit.port';
import { RedisParticipationAccessRateLimitAdapter } from '../../../src/modules/participation/infrastructure/security/redis-participation-access-rate-limit.adapter';

describe('RedisParticipationAccessRateLimitAdapter', () => {
  it('uses digests instead of storing the client address or reference token in Redis keys', async () => {
    const evalCommand = jest
      .fn<Promise<number>, [string, number, string, number]>()
      .mockResolvedValue(1);
    const adapter = new RedisParticipationAccessRateLimitAdapter({
      eval: evalCommand,
    } as unknown as RedisClient);

    await adapter.consume({
      clientAddress: '198.51.100.10',
      referenceToken: 'secret-reference',
    });

    expect(evalCommand).toHaveBeenCalledTimes(2);
    const keys = evalCommand.mock.calls.map((call) => call[2]);
    expect(keys.join(' ')).not.toContain('198.51.100.10');
    expect(keys.join(' ')).not.toContain('secret-reference');
  });

  it('rejects an exchange when either fixed window exceeds its limit', async () => {
    const evalCommand = jest
      .fn<Promise<number>, [string, number, string, number]>()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(21);
    const adapter = new RedisParticipationAccessRateLimitAdapter({
      eval: evalCommand,
    } as unknown as RedisClient);

    await expect(
      adapter.consume({
        clientAddress: '198.51.100.10',
        referenceToken: 'secret-reference',
      }),
    ).rejects.toBeInstanceOf(ParticipationAccessRateLimitExceededError);
  });

  it('fails closed when the shared limiter is unavailable', async () => {
    const adapter = new RedisParticipationAccessRateLimitAdapter({
      eval: jest.fn().mockRejectedValue(new Error('redis unavailable')),
    } as unknown as RedisClient);

    await expect(
      adapter.consume({
        clientAddress: '198.51.100.10',
        referenceToken: 'secret-reference',
      }),
    ).rejects.toBeInstanceOf(ParticipationAccessRateLimitUnavailableError);
  });
});
