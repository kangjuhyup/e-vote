import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { SmsDispatchRepositoryPort } from '../../../../../../shared/application/port/persistence/sms-dispatch-repository.port';
import type { SmsDispatchAggregate } from '../../../../../../shared/domain/sms/sms-dispatch.aggregate';
import { DomainError } from '../../../../../../shared/domain/domain-error';
import { SmsMessagePurpose } from '../../../../../../shared/domain/voting/type/sms-message-purpose.type';
import {
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
} from '../../../../../../platform/database/repository/database-repository.util';

@Injectable()
export class SmsDispatchRepositoryAdapter implements SmsDispatchRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async reserveUpcomingVoteNotice(voteId: string): Promise<string> {
    const dispatchId = this.nextId();
    await this.em.transactional(async (em) => {
      const connection = em.getConnection();
      const transaction = em.getTransactionContext<object>();
      const votes = (await connection.execute(
        'select "billing_order_id", "started_at", "status" from "votes" where "id" = ? for update',
        [voteId],
        'all',
        transaction,
      )) as unknown as {
        billing_order_id: string | null;
        started_at: Date;
        status: string;
      }[];
      const vote = votes[0];
      const now = new Date();
      if (
        !vote ||
        vote.status !== 'FINALIZED' ||
        new Date(vote.started_at).getTime() <= now.getTime()
      ) {
        throw new DomainError(
          'only unopened finalized votes can send upcoming notices',
        );
      }
      const paidOrders = await connection.execute<{ id: string }[]>(
        'select "id" from "billing_orders" where "id" = ? and "vote_id" = ? and "status" = ?',
        [vote.billing_order_id, voteId, 'PAID'],
        'all',
        transaction,
      );
      if (paidOrders.length === 0) {
        throw new DomainError(
          'upcoming vote notices require an active paid billing order',
        );
      }
      await connection.execute(
        'insert into "sms_dispatches" ("id", "vote_id", "field_voting_session_id", "purpose", "sent_at", "recipient_count", "success_count", "failure_count", "created_at") values (?, ?, null, ?, ?, 0, 0, 0, ?)',
        [dispatchId, voteId, SmsMessagePurpose.UpcomingVoteNotice, now, now],
        'run',
        transaction,
      );
    });
    return dispatchId;
  }

  async save(dispatch: SmsDispatchAggregate): Promise<void> {
    const {
      SmsDispatchEntity,
      SmsDeliveryEntity,
      VoteEntity,
      FieldVotingSessionEntity,
    } = await getDatabaseEntities();

    const existing =
      dispatch.purpose === SmsMessagePurpose.UpcomingVoteNotice
        ? await this.em.findOne(SmsDispatchEntity as any, { id: dispatch.id })
        : null;
    const values = {
      id: dispatch.id,
      vote: entityReference(this.em, VoteEntity, dispatch.voteId),
      fieldVotingSession: dispatch.fieldVotingSessionId
        ? entityReference(
            this.em,
            FieldVotingSessionEntity,
            dispatch.fieldVotingSessionId,
          )
        : null,
      purpose: dispatch.purpose,
      sentAt: dispatch.sentAt,
      recipientCount: dispatch.recipientCount,
      successCount: dispatch.successCount,
      failureCount: dispatch.failureCount,
      createdAt: new Date(),
    };
    const dispatchEntity = existing
      ? Object.assign(existing, {
          sentAt: values.sentAt,
          recipientCount: values.recipientCount,
          successCount: values.successCount,
          failureCount: values.failureCount,
        })
      : this.em.create(SmsDispatchEntity as any, values as any);
    if (!existing) this.em.persist(dispatchEntity);

    for (const delivery of dispatch.deliveries) {
      this.em.persist(
        this.em.create(
          SmsDeliveryEntity as any,
          {
            id: delivery.id,
            dispatch: dispatchEntity,
            electorId: delivery.electorId,
            recipientName: delivery.recipientName,
            recipientIdentifier: delivery.recipientIdentifier,
            status: delivery.status,
            failureReason: delivery.failureReason ?? null,
            participationInvitationGeneration:
              delivery.participationInvitationGeneration ?? null,
            createdAt: dispatch.sentAt,
          } as any,
        ),
      );
    }

    await this.em.flush();
  }
}
