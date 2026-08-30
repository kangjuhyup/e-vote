import { readRedisConnectionConfig } from '../../../src/platform/redis/redis-config';

describe('readRedisConnectionConfig', () => {
  it('builds standalone Redis options from REDIS_URL', () => {
    const config = readRedisConnectionConfig({
      REDIS_URL: 'redis://vote-user:secret@redis.internal:6380/2',
      REDIS_CONNECT_TIMEOUT_MS: '2500',
      REDIS_LAZY_CONNECT: 'false',
    });

    expect(config).toEqual({
      mode: 'standalone',
      options: {
        host: 'redis.internal',
        port: 6380,
        username: 'vote-user',
        password: 'secret',
        db: 2,
        connectTimeout: 2500,
        lazyConnect: false,
      },
    });
  });

  it('builds cluster Redis options from REDIS_CLUSTER_NODES', () => {
    const config = readRedisConnectionConfig({
      REDIS_CLUSTER_NODES: 'redis-a:6379,redis-b:6380',
      REDIS_PASSWORD: 'secret',
    });

    expect(config).toEqual({
      mode: 'cluster',
      nodes: [
        { host: 'redis-a', port: 6379 },
        { host: 'redis-b', port: 6380 },
      ],
      options: {
        lazyConnect: true,
        redisOptions: {
          password: 'secret',
        },
      },
    });
  });
});
