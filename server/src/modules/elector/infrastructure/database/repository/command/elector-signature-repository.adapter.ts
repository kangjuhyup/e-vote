import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ElectorSignatureRepositoryPort,
  SaveElectorSignatureParams,
  SaveElectorSignatureResult,
} from '../../../../application/port/persistence/command/elector-signature-repository.port';
import { nextRepositoryId } from '../../../../../../platform/database/repository/database-repository.util';

type IdRow = { readonly id: string };
type SignatureAttachmentRow = {
  readonly id: string;
  readonly file_id: string;
};

@Injectable()
export class ElectorSignatureRepositoryAdapter implements ElectorSignatureRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async hasConfirmedSignature(
    voteId: string,
    electorId: string,
  ): Promise<boolean> {
    const rows = await this.execute<IdRow[]>(
      `select ea.id
       from elector_attachments ea
       join electors e on e.id = ea.elector_id
       join files f on f.id = ea.file_id
       where ea.elector_id = ? and e.vote_id = ?
         and ea.type = 'SIGNATURE' and f.status = 'ACTIVE'
       limit 1`,
      [electorId, voteId],
    );

    return rows.length > 0;
  }

  async save(
    params: SaveElectorSignatureParams,
  ): Promise<SaveElectorSignatureResult> {
    const electors = await this.execute<IdRow[]>(
      'select id from electors where id = ? and vote_id = ? for share',
      [params.electorId, params.voteId],
    );
    if (electors.length === 0) {
      throw new Error('elector not found');
    }

    const fileId = await this.upsertFile(params);
    const attachments = await this.execute<SignatureAttachmentRow[]>(
      `select id, file_id from elector_attachments
       where elector_id = ? and type = 'SIGNATURE' for update`,
      [params.electorId],
    );
    const attachment = attachments[0];

    if (attachment) {
      await this.execute(
        'update elector_attachments set file_id = ? where id = ?',
        [fileId, attachment.id],
      );
      if (attachment.file_id !== fileId) {
        await this.execute(
          `update files set status = 'DELETED', deleted_at = current_timestamp
           where id = ?`,
          [attachment.file_id],
        );
      }
    } else {
      await this.execute(
        `insert into elector_attachments (id, elector_id, file_id, type, created_at)
         values (?, ?, ?, 'SIGNATURE', current_timestamp)`,
        [nextRepositoryId(), params.electorId, fileId],
      );
    }

    return { fileId, storageKey: params.file.storageKey };
  }

  private async upsertFile(
    params: SaveElectorSignatureParams,
  ): Promise<string> {
    const files = await this.execute<IdRow[]>(
      `insert into files
         (id, storage_key, original_name, mime_type, size_bytes, checksum,
          status, created_at, deleted_at)
       values (?, ?, ?, ?, ?, ?, 'ACTIVE', current_timestamp, null)
       on conflict (storage_key) do update set
         original_name = excluded.original_name,
         mime_type = excluded.mime_type,
         size_bytes = excluded.size_bytes,
         checksum = excluded.checksum,
         status = 'ACTIVE',
         deleted_at = null
       returning id`,
      [
        nextRepositoryId(),
        params.file.storageKey,
        params.file.originalName,
        params.file.mimeType,
        params.file.sizeBytes,
        params.file.checksum ?? null,
      ],
    );
    const file = files[0];
    if (!file) {
      throw new Error('failed to persist elector signature file');
    }
    return file.id;
  }

  private execute<T = unknown>(
    sql: string,
    params: readonly unknown[],
  ): Promise<T> {
    return this.em
      .getConnection()
      .execute(
        sql,
        [...params],
        'all',
        this.em.getTransactionContext(),
      ) as Promise<T>;
  }
}
