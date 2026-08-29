import { Injectable } from '@nestjs/common';
import {
  DatabaseHealthPort,
  DatabaseHealthResult,
} from '../../application/port/health/database-health.port';

@Injectable()
export class NotConfiguredDatabaseHealthAdapter implements DatabaseHealthPort {
  ping(): Promise<DatabaseHealthResult> {
    return Promise.resolve({
      status: 'down',
      reason: 'not_configured',
    });
  }
}
