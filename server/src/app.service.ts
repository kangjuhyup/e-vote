import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DATABASE_HEALTH_PORT } from './application/port/database-health.port';
import type { DatabaseHealthPort } from './application/port/database-health.port';

type LivenessResponse = {
  status: 'ok';
};

type ReadinessResponse = {
  status: 'ok';
  checks: {
    database: 'up';
  };
};

@Injectable()
export class AppService {
  constructor(
    @Inject(DATABASE_HEALTH_PORT)
    private readonly databaseHealth: DatabaseHealthPort,
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
    const database = await this.databaseHealth.ping();

    if (database.status === 'down') {
      throw new ServiceUnavailableException(
        `database is not ready: ${database.reason}`,
      );
    }

    return {
      status: 'ok',
      checks: {
        database: 'up',
      },
    };
  }
}
