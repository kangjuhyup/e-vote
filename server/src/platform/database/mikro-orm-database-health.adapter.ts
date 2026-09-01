import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type {
  DatabaseHealthPort,
  DatabaseHealthResult,
} from '../../shared/application/port/health/database-health.port';

@Injectable()
export class MikroOrmDatabaseHealthAdapter implements DatabaseHealthPort {
  constructor(private readonly em: EntityManager) {}

  async ping(): Promise<DatabaseHealthResult> {
    try {
      await this.em.getConnection().execute('select 1');

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        reason: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  }
}
