import { Test, TestingModule } from '@nestjs/testing';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../src/infrastructure/redis/redis.constants';
import { RedisModule } from '../src/infrastructure/redis/redis.module';

describe('RedisModule (docker e2e)', () => {
  let moduleRef: TestingModule;
  let client: RedisClient;
  let originalEnv: NodeJS.ProcessEnv;
  let wroteKey = false;

  const key = `vote:redis:e2e:${process.pid}`;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.REDIS_URL =
      process.env.REDIS_E2E_URL ?? 'redis://127.0.0.1:6380/0';
    process.env.REDIS_LAZY_CONNECT = 'true';
    process.env.REDIS_CONNECT_TIMEOUT_MS = '500';

    moduleRef = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();
    client = moduleRef.get<RedisClient>(REDIS_CLIENT);
  });

  afterAll(async () => {
    if (client && wroteKey) {
      await client.del(key);
    }

    if (moduleRef) {
      await moduleRef.close();
    }

    process.env = originalEnv;
  });

  it('writes and reads through a Redis container', async () => {
    await client.set(key, 'connected');
    wroteKey = true;

    await expect(client.get(key)).resolves.toBe('connected');
  });
});
