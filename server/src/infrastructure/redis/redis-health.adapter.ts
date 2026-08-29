import { Inject, Injectable } from '@nestjs/common';
import {
  RedisHealthPort,
  RedisHealthResult,
} from '../../application/port/health/redis-health.port';
import { REDIS_CLIENT, type RedisClient } from './redis.constants';

@Injectable()
export class RedisHealthAdapter implements RedisHealthPort {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClient,
  ) {}

  async ping(): Promise<RedisHealthResult> {
    try {
      const response = await this.redisClient.ping();

      if (response !== 'PONG') {
        return {
          status: 'down',
          reason: 'unexpected_response',
        };
      }

      return {
        status: 'up',
      };
    } catch (error) {
      return {
        status: 'down',
        reason: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  }
}
