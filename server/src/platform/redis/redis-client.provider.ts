import {
  Injectable,
  type OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import { Cluster, Redis } from 'ioredis';
import {
  readRedisConnectionConfig,
  type RedisConnectionConfig,
} from './redis-config';
import { REDIS_CLIENT, type RedisClient } from './redis.constants';

export function createRedisClient(config: RedisConnectionConfig): RedisClient {
  if (config.mode === 'cluster') {
    return new Cluster(config.nodes, config.options);
  }

  return new Redis(config.options);
}

@Injectable()
export class RedisClientProvider implements OnApplicationShutdown {
  private readonly client = createRedisClient(readRedisConnectionConfig());

  getClient(): RedisClient {
    return this.client;
  }

  onApplicationShutdown(): void {
    this.client.disconnect();
  }
}

export const redisClientProvider: Provider<RedisClient> = {
  provide: REDIS_CLIENT,
  inject: [RedisClientProvider],
  useFactory: (provider: RedisClientProvider) => provider.getClient(),
};
