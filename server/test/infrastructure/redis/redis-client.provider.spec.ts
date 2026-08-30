import { Cluster, Redis } from 'ioredis';
import { createRedisClient } from '../../../src/platform/redis/redis-client.provider';

describe('createRedisClient', () => {
  const clients: Array<Redis | Cluster> = [];

  afterEach(() => {
    while (clients.length > 0) {
      clients.pop()?.disconnect();
    }
  });

  it('creates a standalone Redis client for standalone config', () => {
    const client = createRedisClient({
      mode: 'standalone',
      options: {
        host: '127.0.0.1',
        port: 6379,
        lazyConnect: true,
      },
    });
    clients.push(client);

    expect(client).toBeInstanceOf(Redis);
  });

  it('creates a Redis Cluster client for cluster config', () => {
    const client = createRedisClient({
      mode: 'cluster',
      nodes: [{ host: 'redis-a', port: 6379 }],
      options: {
        lazyConnect: true,
      },
    });
    clients.push(client);

    expect(client).toBeInstanceOf(Cluster);
  });
});
