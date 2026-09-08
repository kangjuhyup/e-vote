import { SmsDispatchAggregate } from '../../../src/shared/domain/sms/sms-dispatch.aggregate';
import { SmsDeliveryStatus } from '../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { SmsMessagePurpose } from '../../../src/shared/domain/voting/type/sms-message-purpose.type';

describe('SMS participation invitation generation', () => {
  const create = (generation: number | undefined) =>
    SmsDispatchAggregate.create({
      id: 'dispatch-1',
      voteId: 'vote-1',
      purpose: SmsMessagePurpose.VoteParticipationReminder,
      sentAt: new Date('2026-09-08T13:00:00.000Z'),
      deliveries: [
        {
          id: 'delivery-1',
          electorId: 'elector-1',
          recipientName: '선거인',
          recipientIdentifier: 'member-1',
          status: SmsDeliveryStatus.Success,
          participationInvitationGeneration: generation,
        },
      ],
    });

  it('keeps the non-secret generation on a delivery', () => {
    expect(create(3).deliveries[0]?.participationInvitationGeneration).toBe(3);
  });

  it.each([0, -1, 1.5])('rejects invalid generations: %s', (generation) => {
    expect(() => create(generation)).toThrow(
      'participation invitation generation must be a positive integer',
    );
  });
});
