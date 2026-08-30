import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import {
  REDIS_HEALTH_PORT,
  RedisHealthPort,
} from '../../../src/shared/application/port/health/redis-health.port';
import {
  REDIS_CLIENT,
  RedisClient,
} from '../../../src/platform/redis/redis.constants';
import { RedisModule } from '../../../src/platform/redis/redis.module';

describe('RedisModule', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_LAZY_CONNECT = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exports the configured Redis client token', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();

    const client = moduleRef.get<RedisClient>(REDIS_CLIENT);

    expect(client).toBeInstanceOf(Redis);

    await moduleRef.close();
  });

  it('exports the Redis health port', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();

    const redisHealth = moduleRef.get<RedisHealthPort>(REDIS_HEALTH_PORT);

    expect(redisHealth).toBeDefined();
    expect(redisHealth).toHaveProperty('ping');

    await moduleRef.close();
  });

  it('disconnects the Redis client when the module closes', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();

    const client = moduleRef.get<Redis>(REDIS_CLIENT);

    await moduleRef.close();

    expect(client.status).toBe('end');
  });
});
