import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DATABASE_HEALTH_PORT } from './application/port/health/database-health.port';
import type { DatabaseHealthPort } from './application/port/health/database-health.port';
import { REDIS_HEALTH_PORT } from './application/port/health/redis-health.port';
import type { RedisHealthPort } from './application/port/health/redis-health.port';
import { STORAGE_HEALTH_PORT } from './application/port/health/storage-health.port';
import type { StorageHealthPort } from './application/port/health/storage-health.port';

type LivenessResponse = {
  status: 'ok';
};

type ReadinessResponse = {
  status: 'ok';
  checks: {
    database: 'up';
    redis: 'up';
    storage: 'up';
  };
};

@Injectable()
export class AppService {
  constructor(
    @Inject(DATABASE_HEALTH_PORT)
    private readonly databaseHealth: DatabaseHealthPort,
    @Inject(REDIS_HEALTH_PORT)
    private readonly redisHealth: RedisHealthPort,
    @Inject(STORAGE_HEALTH_PORT)
    private readonly storageHealth: StorageHealthPort,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const [database, redis, storage] = await Promise.all([
      this.databaseHealth.ping(),
      this.redisHealth.ping(),
      this.storageHealth.ping(),
    ]);

    if (database.status === 'down') {
      throw new ServiceUnavailableException(
        `database is not ready: ${database.reason}`,
      );
    }

    if (redis.status === 'down') {
      throw new ServiceUnavailableException(
        `redis is not ready: ${redis.reason}`,
      );
    }

    if (storage.status === 'down') {
      throw new ServiceUnavailableException(
        `storage is not ready: ${storage.reason}`,
      );
    }

    return {
      status: 'ok',
      checks: {
        database: 'up',
        redis: 'up',
        storage: 'up',
      },
    };
  }
}
