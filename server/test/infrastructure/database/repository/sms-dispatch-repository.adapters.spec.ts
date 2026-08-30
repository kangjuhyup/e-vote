import { LoadStrategy } from '@mikro-orm/core';
import { SmsDispatchReadRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/query/sms-dispatch-read-repository.adapter';
import { SmsDispatchRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/command/sms-dispatch-repository.adapter';
import { SmsDispatchAggregate } from '../../../../src/shared/domain/sms/sms-dispatch.aggregate';
import { SmsDeliveryStatus } from '../../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { SmsMessagePurpose } from '../../../../src/shared/domain/voting/type/sms-message-purpose.type';

describe('SMS dispatch repository adapters', () => {
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
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      deliveries: [
        {
          id: 'delivery-1',
          electorId: 'elector-1',
          recipientName: '홍길동',
          recipientIdentifier: 'member-1',
          status: SmsDeliveryStatus.Failure,
          failureReason: 'invalid destination',
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
    });
    expect(created.every((data) => !('phoneNumber' in data))).toBe(true);
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
      .mockResolvedValue([[entity], 1]);
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
  });
});
