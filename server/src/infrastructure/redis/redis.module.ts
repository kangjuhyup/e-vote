import { Module } from '@nestjs/common';
import { REDIS_HEALTH_PORT } from '../../application/port/health/redis-health.port';
import {
  RedisClientProvider,
  redisClientProvider,
} from './redis-client.provider';
import { REDIS_CLIENT } from './redis.constants';
import { RedisHealthAdapter } from './redis-health.adapter';

@Module({
  providers: [
    RedisClientProvider,
    redisClientProvider,
    {
      provide: REDIS_HEALTH_PORT,
      useClass: RedisHealthAdapter,
    },
  ],
  exports: [REDIS_CLIENT, REDIS_HEALTH_PORT],
})
export class RedisModule {}
