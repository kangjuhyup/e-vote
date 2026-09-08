import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { SmsDispatchRepositoryPort } from '../../../../../../shared/application/port/persistence/sms-dispatch-repository.port';
import type { SmsDispatchAggregate } from '../../../../../../shared/domain/sms/sms-dispatch.aggregate';
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

  async save(dispatch: SmsDispatchAggregate): Promise<void> {
    const {
      SmsDispatchEntity,
      SmsDeliveryEntity,
      VoteEntity,
      FieldVotingSessionEntity,
    } = await getDatabaseEntities();

    const dispatchEntity = this.em.create(
      SmsDispatchEntity as any,
      {
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
      } as any,
    );
    this.em.persist(dispatchEntity);

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
