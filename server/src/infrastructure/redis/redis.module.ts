import { Module } from '@nestjs/common';
import {
  RedisClientProvider,
  redisClientProvider,
} from './redis-client.provider';
import { REDIS_CLIENT } from './redis.constants';

@Module({
  providers: [RedisClientProvider, redisClientProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
