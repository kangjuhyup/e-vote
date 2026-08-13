import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DATABASE_HEALTH_PORT } from './application/port/database-health.port';
import type { DatabaseHealthPort } from './application/port/database-health.port';
import { STORAGE_HEALTH_PORT } from './application/port/storage-health.port';
import type { StorageHealthPort } from './application/port/storage-health.port';

type LivenessResponse = {
  status: 'ok';
};

type ReadinessResponse = {
  status: 'ok';
  checks: {
    database: 'up';
    storage: 'up';
  };
};

@Injectable()
export class AppService {
  constructor(
    @Inject(DATABASE_HEALTH_PORT)
    private readonly databaseHealth: DatabaseHealthPort,
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
    const [database, storage] = await Promise.all([
      this.databaseHealth.ping(),
      this.storageHealth.ping(),
    ]);

    if (database.status === 'down') {
      throw new ServiceUnavailableException(
        `database is not ready: ${database.reason}`,
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
        storage: 'up',
      },
    };
  }
}
