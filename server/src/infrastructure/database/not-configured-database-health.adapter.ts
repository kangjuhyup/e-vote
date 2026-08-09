import { Injectable } from '@nestjs/common';
import {
  DatabaseHealthPort,
  DatabaseHealthResult,
} from '../../application/port/database-health.port';

@Injectable()
export class NotConfiguredDatabaseHealthAdapter implements DatabaseHealthPort {
  async ping(): Promise<DatabaseHealthResult> {
    return {
      status: 'down',
      reason: 'not_configured',
    };
  }
}
