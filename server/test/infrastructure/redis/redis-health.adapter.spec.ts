import { RedisHealthAdapter } from '../../../src/infrastructure/redis/redis-health.adapter';
import { type RedisClient } from '../../../src/infrastructure/redis/redis.constants';

describe('RedisHealthAdapter', () => {
  it('returns up when Redis replies with PONG', async () => {
    const adapter = new RedisHealthAdapter({
      ping: jest.fn().mockResolvedValue('PONG'),
    } as unknown as RedisClient);

    await expect(adapter.ping()).resolves.toEqual({ status: 'up' });
  });

  it('returns down when Redis returns an unexpected ping response', async () => {
    const adapter = new RedisHealthAdapter({
      ping: jest.fn().mockResolvedValue('OK'),
    } as unknown as RedisClient);

    await expect(adapter.ping()).resolves.toEqual({
      status: 'down',
      reason: 'unexpected_response',
    });
  });

  it('returns down when Redis ping throws', async () => {
    const adapter = new RedisHealthAdapter({
      ping: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as RedisClient);

    await expect(adapter.ping()).resolves.toEqual({
      status: 'down',
      reason: 'connection refused',
    });
  });
});
