import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { FileRepositoryPort } from '../../../application/port/file-repository.port';
import { getDatabaseEntities } from './database-repository.util';

const ACTIVE_FILE_STATUS = 'ACTIVE';

@Injectable()
export class FileRepositoryAdapter implements FileRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async existsById(fileId: string): Promise<boolean> {
    const { FileEntity } = await getDatabaseEntities();
    const count = await this.em.count(FileEntity as any, {
      id: fileId,
      status: ACTIVE_FILE_STATUS,
    });

    return count > 0;
  }
}
