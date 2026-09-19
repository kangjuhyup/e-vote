import { LoadStrategy } from '@mikro-orm/core';
import { SmsDispatchReadRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/query/sms-dispatch-read-repository.adapter';
import { SmsDispatchRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/command/sms-dispatch-repository.adapter';
import { SmsDispatchAggregate } from '../../../../src/shared/domain/sms/sms-dispatch.aggregate';
import { SmsDeliveryStatus } from '../../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { SmsMessagePurpose } from '../../../../src/shared/domain/voting/type/sms-message-purpose.type';

describe('SMS dispatch repository adapters', () => {
  it('reserves an upcoming notice before external delivery while holding the vote lock', async () => {
    const execute = jest
      .fn<Promise<unknown>, [string, unknown[], string, object]>()
      .mockResolvedValueOnce([
        {
          billing_order_id: 'billing-order-1',
          started_at: new Date(Date.now() + 60_000),
          status: 'FINALIZED',
        },
      ])
      .mockResolvedValueOnce([{ id: 'billing-order-1' }])
      .mockResolvedValueOnce([]);
    const transaction = {};
    const transactionalEntityManager = {
      getConnection: () => ({ execute }),
      getTransactionContext: () => transaction,
    };
    const em = {
      transactional: jest.fn(
        (
          work: (
            entityManager: typeof transactionalEntityManager,
          ) => Promise<unknown>,
        ) => work(transactionalEntityManager),
      ),
    };

    const id = await new SmsDispatchRepositoryAdapter(
      em as any,
    ).reserveUpcomingVoteNotice('vote-1');

    expect(id).toBeTruthy();
    expect(execute.mock.calls[0][0]).toContain('for update');
    expect(execute.mock.calls[1][1]).toEqual([
      'billing-order-1',
      'vote-1',
      'PAID',
    ]);
    expect(execute.mock.calls[2][0]).toContain('insert into "sms_dispatches"');
    expect(execute.mock.calls[2][1]).toEqual([
      id,
      'vote-1',
      SmsMessagePurpose.UpcomingVoteNotice,
      expect.any(Date),
      expect.any(Date),
    ]);
  });

  it('does not reserve an upcoming notice after a refund request', async () => {
    const execute = jest
      .fn<Promise<unknown>, [string, unknown[], string, object]>()
      .mockResolvedValueOnce([
        {
          billing_order_id: 'billing-order-1',
          started_at: new Date(Date.now() + 60_000),
          status: 'FINALIZED',
        },
      ])
      .mockResolvedValueOnce([]);
    const transactionalEntityManager = {
      getConnection: () => ({ execute }),
      getTransactionContext: () => ({}),
    };
    const em = {
      transactional: jest.fn(
        (
          work: (
            entityManager: typeof transactionalEntityManager,
          ) => Promise<unknown>,
        ) => work(transactionalEntityManager),
      ),
    };

    await expect(
      new SmsDispatchRepositoryAdapter(em as any).reserveUpcomingVoteNotice(
        'vote-1',
      ),
    ).rejects.toThrow('active paid billing order');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('persists an immutable summary and per-recipient outcomes', async () => {
    const created: Record<string, unknown>[] = [];
    const em = {
      create: jest.fn((_entity, data: Record<string, unknown>) => {
        created.push(data);
        return data;
      }),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      getReference: jest.fn((_entity: unknown, id: unknown) => ({ id })),
    };
    const dispatch = SmsDispatchAggregate.create({
      id: 'dispatch-1',
      voteId: 'vote-1',
      purpose: SmsMessagePurpose.VoteParticipationReminder,
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      deliveries: [
        {
          id: 'delivery-1',
          electorId: 'elector-1',
          recipientName: '홍길동',
          recipientIdentifier: 'member-1',
          status: SmsDeliveryStatus.Failure,
          failureReason: 'invalid destination',
          participationInvitationGeneration: 3,
        },
      ],
    });

    await new SmsDispatchRepositoryAdapter(em as any).save(dispatch);

    expect(created[0]).toMatchObject({
      id: 'dispatch-1',
      vote: { id: 'vote-1' },
      recipientCount: 1,
      successCount: 0,
      failureCount: 1,
    });
    expect(created[1]).toMatchObject({
      id: 'delivery-1',
      electorId: 'elector-1',
      recipientName: '홍길동',
      recipientIdentifier: 'member-1',
      status: SmsDeliveryStatus.Failure,
      failureReason: 'invalid destination',
      participationInvitationGeneration: 3,
    });
    expect(created.every((data) => !('phoneNumber' in data))).toBe(true);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('fills a reserved upcoming notice with the provider delivery results', async () => {
    const reserved = {
      id: 'dispatch-1',
      recipientCount: 0,
      successCount: 0,
      failureCount: 0,
    };
    const em = {
      findOne: jest.fn().mockResolvedValue(reserved),
      create: jest.fn(
        (_entity: unknown, values: Record<string, unknown>) => values,
      ),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      getReference: jest.fn((_entity: unknown, id: string) => ({ id })),
    };
    const dispatch = SmsDispatchAggregate.create({
      id: 'dispatch-1',
      voteId: 'vote-1',
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      deliveries: [
        {
          id: 'delivery-1',
          electorId: 'elector-1',
          recipientName: '홍길동',
          recipientIdentifier: 'member-1',
          status: SmsDeliveryStatus.Success,
        },
      ],
    });

    await new SmsDispatchRepositoryAdapter(em as any).save(dispatch);

    expect(reserved).toMatchObject({ recipientCount: 1, successCount: 1 });
    expect(em.create).toHaveBeenCalledTimes(1);
    expect(em.persist).toHaveBeenCalledTimes(1);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('filters summaries and details by vote and maps delivery failures', async () => {
    const entity = {
      id: 'dispatch-1',
      vote: { id: 'vote-1' },
      fieldVotingSession: null,
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      recipientCount: 2,
      successCount: 1,
      failureCount: 1,
      deliveries: [
        {
          id: 'delivery-2',
          electorId: 'elector-2',
          recipientName: '김철수',
          recipientIdentifier: 'member-2',
          status: SmsDeliveryStatus.Failure,
          failureReason: 'provider rejected the request',
        },
        {
          id: 'delivery-1',
          electorId: 'elector-1',
          recipientName: '홍길동',
          recipientIdentifier: 'member-1',
          status: SmsDeliveryStatus.Success,
          failureReason: null,
        },
      ],
    };
    const findAndCount = jest
      .fn<Promise<[unknown[], number]>, [unknown, unknown, unknown?]>()
      .mockResolvedValueOnce([[entity], 1])
      .mockResolvedValueOnce([[entity.deliveries[1], entity.deliveries[0]], 2]);
    const findOne = jest
      .fn<Promise<unknown>, [unknown, unknown, unknown?]>()
      .mockResolvedValue(entity);
    const adapter = new SmsDispatchReadRepositoryAdapter({
      findAndCount,
      findOne,
    } as any);

    const page = await adapter.findPage({
      voteId: 'vote-1',
      page: 2,
      pageSize: 20,
    });
    expect(findAndCount.mock.calls[0][1]).toEqual({
      vote: { id: 'vote-1' },
    });
    expect(findAndCount.mock.calls[0][2]).toMatchObject({
      limit: 20,
      offset: 20,
      orderBy: { sentAt: 'desc', id: 'desc' },
      strategy: LoadStrategy.JOINED,
    });
    expect(page.items[0]).toMatchObject({
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      successCount: 1,
      failureCount: 1,
    });

    const detail = await adapter.findDetail({
      voteId: 'vote-1',
      smsDispatchId: 'dispatch-1',
      page: 1,
      pageSize: 20,
    });
    expect(findOne.mock.calls[0][1]).toEqual({
      id: 'dispatch-1',
      vote: { id: 'vote-1' },
    });
    expect(detail?.deliveries).toEqual([
      expect.objectContaining({
        recipientIdentifier: 'member-1',
        status: SmsDeliveryStatus.Success,
      }),
      expect.objectContaining({
        recipientIdentifier: 'member-2',
        status: SmsDeliveryStatus.Failure,
        failureReason: 'provider rejected the request',
      }),
    ]);
    expect(findAndCount.mock.calls[1][1]).toEqual({
      dispatch: { id: 'dispatch-1' },
    });
    expect(findAndCount.mock.calls[1][2]).toMatchObject({
      limit: 20,
      offset: 0,
      orderBy: { recipientIdentifier: 'asc', id: 'asc' },
    });
  });
});
