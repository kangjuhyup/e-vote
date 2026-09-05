import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { IntegrationEventOutboxPort } from '../../../../../shared/application/port/messaging/integration-event-outbox.port';
import type {
  ClaimOutboxMessagesParams,
  MarkOutboxMessageDeadParams,
  OutboxMessageLeaseParams,
  OutboxMessageRepositoryPort,
  RescheduleOutboxMessageParams,
} from '../../../../../shared/application/port/messaging/outbox-message-repository.port';
import { ClaimedOutboxMessage } from '../../../../../shared/application/messaging/claimed-outbox-message';
import { IntegrationEventEnvelope } from '../../../../../shared/application/messaging/integration-event-envelope';
import { getDatabaseEntities } from '../../../../database/repository/database-repository.util';

interface ClaimedOutboxRow {
  readonly id: string;
  readonly deduplication_key: string;
  readonly source: string;
  readonly event_type: string;
  readonly schema_version: number;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number;
  readonly event_position: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly correlation_id: string | null;
  readonly causation_id: string | null;
  readonly occurred_at: Date | string;
  readonly created_at: Date | string;
  readonly lock_token: string;
  readonly publish_attempt_count: number;
}

@Injectable()
export class IntegrationOutboxRepositoryAdapter
  implements IntegrationEventOutboxPort, OutboxMessageRepositoryPort
{
  constructor(private readonly em: EntityManager) {}

  async append(messages: readonly IntegrationEventEnvelope[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    const { IntegrationOutboxEntity } = await getDatabaseEntities();
    for (const message of messages) {
      const entity = this.em.create(
        IntegrationOutboxEntity as never,
        {
          id: message.id,
          deduplicationKey: message.deduplicationKey,
          source: message.source,
          eventType: message.eventType,
          schemaVersion: message.schemaVersion,
          aggregateType: message.aggregateType,
          aggregateId: message.aggregateId,
          aggregateVersion: message.aggregateVersion,
          eventPosition: message.eventPosition,
          payload: message.payload,
          correlationId: message.correlationId ?? null,
          causationId: message.causationId ?? null,
          occurredAt: message.occurredAt,
          createdAt: message.createdAt,
          status: 'PENDING',
          availableAt: message.createdAt,
          claimCount: 0,
          publishAttemptCount: 0,
          lockedBy: null,
          lockToken: null,
          lockedUntil: null,
          publishedAt: null,
          lastError: null,
        } as never,
      );
      this.em.persist(entity);
    }
    await this.em.flush();
  }

  async claimBatch(
    params: ClaimOutboxMessagesParams,
  ): Promise<readonly ClaimedOutboxMessage[]> {
    const lockToken = randomUUID();
    return this.em.transactional(async (transactionalEm) => {
      const rows = await transactionalEm
        .getConnection()
        .execute<ClaimedOutboxRow[]>(
          `
            with claimable as (
              select candidate.id
              from integration_outbox candidate
              where (
                (candidate.status = 'PENDING' and candidate.available_at <= clock_timestamp())
                or
                (candidate.status = 'PROCESSING' and candidate.locked_until <= clock_timestamp())
              )
              and not exists (
                select 1
                from integration_outbox predecessor
                where predecessor.source = candidate.source
                  and predecessor.aggregate_type = candidate.aggregate_type
                  and predecessor.aggregate_id = candidate.aggregate_id
                  and predecessor.status in ('PENDING', 'PROCESSING', 'DEAD')
                  and (
                    predecessor.aggregate_version < candidate.aggregate_version
                    or (
                      predecessor.aggregate_version = candidate.aggregate_version
                      and predecessor.event_position < candidate.event_position
                    )
                  )
              )
              order by candidate.available_at, candidate.created_at, candidate.id
              limit ?
              for update skip locked
            )
            update integration_outbox message
            set status = 'PROCESSING',
                locked_by = ?,
                lock_token = ?,
                locked_until = clock_timestamp() + (? * interval '1 millisecond'),
                claim_count = message.claim_count + 1
            from claimable
            where message.id = claimable.id
            returning message.*
          `,
          [
            params.batchSize,
            params.workerId,
            lockToken,
            params.leaseDurationMs,
          ],
          'all',
          transactionalEm.getTransactionContext(),
        );

      return rows.map((row) => this.toClaimedMessage(row));
    });
  }

  async recordPublishAttempt(
    params: OutboxMessageLeaseParams,
  ): Promise<boolean> {
    return this.updateLeaseOwnedMessage(
      `update integration_outbox
       set publish_attempt_count = publish_attempt_count + 1
       where id = ? and lock_token = ? and status = 'PROCESSING'
       returning id`,
      [params.messageId, params.lockToken],
    );
  }

  async markPublished(params: OutboxMessageLeaseParams): Promise<boolean> {
    return this.updateLeaseOwnedMessage(
      `update integration_outbox
       set status = 'PUBLISHED',
           published_at = clock_timestamp(),
           locked_by = null,
           lock_token = null,
           locked_until = null,
           last_error = null
       where id = ? and lock_token = ? and status = 'PROCESSING'
       returning id`,
      [params.messageId, params.lockToken],
    );
  }

  async reschedule(params: RescheduleOutboxMessageParams): Promise<boolean> {
    return this.updateLeaseOwnedMessage(
      `update integration_outbox
       set status = 'PENDING',
           available_at = clock_timestamp() + (? * interval '1 millisecond'),
           locked_by = null,
           lock_token = null,
           locked_until = null,
           last_error = ?
       where id = ? and lock_token = ? and status = 'PROCESSING'
       returning id`,
      [
        params.delayMs,
        this.sanitizeError(params.errorMessage),
        params.messageId,
        params.lockToken,
      ],
    );
  }

  async markDead(params: MarkOutboxMessageDeadParams): Promise<boolean> {
    return this.updateLeaseOwnedMessage(
      `update integration_outbox
       set status = 'DEAD',
           locked_by = null,
           lock_token = null,
           locked_until = null,
           last_error = ?
       where id = ? and lock_token = ? and status = 'PROCESSING'
       returning id`,
      [
        this.sanitizeError(params.errorMessage),
        params.messageId,
        params.lockToken,
      ],
    );
  }

  private async updateLeaseOwnedMessage(
    sql: string,
    parameters: readonly unknown[],
  ): Promise<boolean> {
    const rows = await this.em
      .getConnection()
      .execute<ReadonlyArray<{ readonly id: string }>>(
        sql,
        parameters,
        'all',
        this.em.getTransactionContext(),
      );
    return rows.length === 1;
  }

  private toClaimedMessage(row: ClaimedOutboxRow): ClaimedOutboxMessage {
    return ClaimedOutboxMessage.of({
      envelope: IntegrationEventEnvelope.of({
        id: row.id,
        deduplicationKey: row.deduplication_key,
        source: row.source,
        eventType: row.event_type,
        schemaVersion: Number(row.schema_version),
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        aggregateVersion: Number(row.aggregate_version),
        eventPosition: Number(row.event_position),
        payload: row.payload,
        occurredAt: new Date(row.occurred_at),
        createdAt: new Date(row.created_at),
        correlationId: row.correlation_id ?? undefined,
        causationId: row.causation_id ?? undefined,
      }),
      lockToken: row.lock_token,
      publishAttemptCount: Number(row.publish_attempt_count),
    });
  }

  private sanitizeError(message: string): string {
    return message.replace(/\s+/g, ' ').trim().slice(0, 1_000);
  }
}
