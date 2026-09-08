import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { SmsDispatchReadRepositoryPort } from '../../../../application/port/persistence/query/sms-dispatch-read-repository.port';
import {
  SmsDeliveryView,
  SmsDispatchPageView,
  SmsDispatchSummaryView,
  SmsDispatchView,
} from '../../../../application/query/dto/response/sms-dispatch.view';
import type { SmsDeliveryStatus } from '../../../../../../shared/domain/sms/type/sms-delivery-status.type';
import type { SmsMessagePurpose } from '../../../../../../shared/domain/voting/type/sms-message-purpose.type';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
} from '../../../../../../platform/database/repository/database-repository.util';

type SmsDeliveryPersistence = {
  readonly id: string;
  readonly electorId: string;
  readonly recipientName: string;
  readonly recipientIdentifier: string;
  readonly status: SmsDeliveryStatus;
  readonly failureReason: string | null;
};

type SmsDispatchPersistence = {
  readonly id: string;
  readonly vote: { readonly id: string };
  readonly fieldVotingSession: { readonly id: string } | null;
  readonly purpose: SmsMessagePurpose;
  readonly sentAt: Date;
  readonly recipientCount: number;
  readonly successCount: number;
  readonly failureCount: number;
};

type SmsDeliveryWithDispatchPersistence = SmsDeliveryPersistence & {
  readonly dispatch: { readonly id: string };
};

@Injectable()
export class SmsDispatchReadRepositoryAdapter implements SmsDispatchReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findPage(request: {
    readonly voteId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<SmsDispatchPageView> {
    const { SmsDispatchEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      SmsDispatchEntity as any,
      { vote: { id: request.voteId } },
      {
        populate: ['vote', 'fieldVotingSession'],
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: { sentAt: 'desc', id: 'desc' },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [SmsDispatchPersistence[], number];

    return SmsDispatchPageView.of({
      items: entities.map((entity) =>
        SmsDispatchSummaryView.of(this.toSummary(entity)),
      ),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  async findDetail(request: {
    readonly voteId: string;
    readonly smsDispatchId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<SmsDispatchView | undefined> {
    const { SmsDeliveryEntity, SmsDispatchEntity } =
      await getDatabaseEntities();
    const entity = (await this.em.findOne(
      SmsDispatchEntity as any,
      { id: request.smsDispatchId, vote: { id: request.voteId } },
      {
        populate: ['vote', 'fieldVotingSession'],
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as SmsDispatchPersistence | null;

    if (!entity) return undefined;

    const [deliveries, totalItems] = (await this.em.findAndCount(
      SmsDeliveryEntity as any,
      { dispatch: { id: request.smsDispatchId } },
      {
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: { recipientIdentifier: 'asc', id: 'asc' },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [SmsDeliveryWithDispatchPersistence[], number];

    return SmsDispatchView.of({
      ...this.toSummary(entity),
      deliveries: deliveries.map((delivery) =>
        SmsDeliveryView.of({
          electorId: delivery.electorId,
          recipientName: delivery.recipientName,
          recipientIdentifier: delivery.recipientIdentifier,
          status: delivery.status,
          failureReason: delivery.failureReason ?? undefined,
        }),
      ),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toSummary(
    entity: SmsDispatchPersistence,
  ): Parameters<typeof SmsDispatchSummaryView.of>[0] {
    return {
      id: entity.id,
      voteId: entity.vote.id,
      fieldVotingSessionId: entity.fieldVotingSession?.id,
      purpose: entity.purpose,
      sentAt: entity.sentAt,
      recipientCount: entity.recipientCount,
      successCount: entity.successCount,
      failureCount: entity.failureCount,
    };
  }
}
