import { SmsDispatchAggregate } from '../../../src/shared/domain/sms/sms-dispatch.aggregate';
import { SmsDeliveryStatus } from '../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { SmsMessagePurpose } from '../../../src/shared/domain/voting/type/sms-message-purpose.type';
import { DomainError } from '../../../src/shared/domain/domain-error';

describe('SmsDispatchAggregate', () => {
  it('derives summary counts from immutable per-recipient outcomes', () => {
    const dispatch = SmsDispatchAggregate.create({
      id: 'dispatch-1',
      voteId: 'vote-1',
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      deliveries: [
        delivery('delivery-1', 'elector-1', SmsDeliveryStatus.Success),
        delivery(
          'delivery-2',
          'elector-2',
          SmsDeliveryStatus.Failure,
          'provider rejected the request',
        ),
      ],
    });

    expect(dispatch.recipientCount).toBe(2);
    expect(dispatch.successCount).toBe(1);
    expect(dispatch.failureCount).toBe(1);
    expect(dispatch.deliveries[1]).toMatchObject({
      electorId: 'elector-2',
      recipientName: '선거인 2',
      recipientIdentifier: 'member-elector-2',
      failureReason: 'provider rejected the request',
    });
  });

  it('requires field-session identity only for field-session messages', () => {
    expect(() =>
      SmsDispatchAggregate.create({
        id: 'dispatch-1',
        voteId: 'vote-1',
        purpose: SmsMessagePurpose.FieldVotingSessionNotice,
        sentAt: new Date(),
        deliveries: [],
      }),
    ).toThrow(DomainError);

    expect(() =>
      SmsDispatchAggregate.create({
        id: 'dispatch-1',
        voteId: 'vote-1',
        purpose: SmsMessagePurpose.UpcomingVoteNotice,
        fieldVotingSessionId: 'session-1',
        sentAt: new Date(),
        deliveries: [],
      }),
    ).toThrow(DomainError);
  });

  it('rejects duplicate electors and inconsistent failure reasons', () => {
    expect(() =>
      SmsDispatchAggregate.create({
        id: 'dispatch-1',
        voteId: 'vote-1',
        purpose: SmsMessagePurpose.UpcomingVoteNotice,
        sentAt: new Date(),
        deliveries: [
          delivery('delivery-1', 'elector-1', SmsDeliveryStatus.Success),
          delivery('delivery-2', 'elector-1', SmsDeliveryStatus.Success),
        ],
      }),
    ).toThrow(DomainError);

    expect(() =>
      SmsDispatchAggregate.create({
        id: 'dispatch-1',
        voteId: 'vote-1',
        purpose: SmsMessagePurpose.UpcomingVoteNotice,
        sentAt: new Date(),
        deliveries: [
          delivery('delivery-1', 'elector-1', SmsDeliveryStatus.Failure),
        ],
      }),
    ).toThrow(DomainError);
  });
});

function delivery(
  id: string,
  electorId: string,
  status: SmsDeliveryStatus,
  failureReason?: string,
) {
  return {
    id,
    electorId,
    recipientName: `선거인 ${electorId.slice(-1)}`,
    recipientIdentifier: `member-${electorId}`,
    status,
    failureReason,
  };
}
