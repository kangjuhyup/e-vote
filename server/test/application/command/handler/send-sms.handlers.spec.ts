import { SendVoteSmsCommand } from '../../../../src/modules/vote/application/command/dto/request/send-vote-sms.command';
import {
  SendVoteSmsHandler,
  VoteSmsAccessDeniedError,
} from '../../../../src/modules/vote/application/command/handler/send-vote-sms.handler';
import { SendFieldVotingSessionSmsCommand } from '../../../../src/modules/field-voting/application/command/dto/request/send-field-voting-session-sms.command';
import { SendFieldVotingSessionSmsHandler } from '../../../../src/modules/field-voting/application/command/handler/send-field-voting-session-sms.handler';
import type { SmsSenderPort } from '../../../../src/shared/application/port/gateway/sms-sender.port';
import type { SmsDispatchRepositoryPort } from '../../../../src/shared/application/port/persistence/sms-dispatch-repository.port';
import type { VoteAccessPort } from '../../../../src/shared/application/port/capability/vote-access.port';
import type { VoteUsageEntitlementAccessPort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { ParticipationReminderLinkIssuerPort } from '../../../../src/shared/application/port/capability/participation-reminder-link-issuer.port';
import type { FieldVotingSessionAccessPort } from '../../../../src/shared/application/port/capability/field-voting-access.port';
import { SmsSenderNotConfiguredError } from '../../../../src/shared/application/error/sms-sender.error';
import { ManagedResourceNotFoundError } from '../../../../src/shared/application/error/managed-resource.error';
import { DomainError } from '../../../../src/shared/domain/domain-error';
import { SmsDeliveryStatus } from '../../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { SmsMessagePurpose } from '../../../../src/shared/domain/voting/type/sms-message-purpose.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import type {
  FieldVotingSessionReference,
  VoteReference,
} from '../../../../src/shared/domain/voting/capability-reference';
import { FieldVotingSessionStatus } from '../../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';

describe('SMS command handlers', () => {
  it.each([
    {
      purpose: SmsMessagePurpose.VoteParticipationReminder,
      status: VoteStatus.Open,
      method: 'sendParticipationReminderToNonParticipants' as const,
    },
    {
      purpose: SmsMessagePurpose.VoteResultNotice,
      status: VoteStatus.Closed,
      method: 'sendResultNotice' as const,
    },
    {
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
      status: VoteStatus.Finalized,
      method: 'sendUpcomingVoteNotice' as const,
    },
  ])(
    'sends $purpose through its purpose-specific port method',
    async (testCase) => {
      const smsSender = createSmsSender();
      const smsDispatchRepository = createSmsDispatchRepository();
      const handler = new SendVoteSmsHandler(
        createVoteAccess(createVote(testCase.status)),
        createEntitlementAccess(),
        smsDispatchRepository,
        createParticipationReminderLinkIssuer(),
        smsSender,
      );

      const result = await handler.execute(
        SendVoteSmsCommand.of({
          voteId: 'vote-1',
          requestedByUserPrincipalId: 'creator-1',
          purpose: testCase.purpose,
          message: '  안내 문자  ',
        }),
      );

      expect(smsSender[testCase.method].mock.calls).toEqual([
        [
          testCase.purpose === SmsMessagePurpose.VoteParticipationReminder
            ? {
                voteId: 'vote-1',
                message: '안내 문자',
                recipients: [
                  {
                    electorId: 'elector-1',
                    participationUrl:
                      'https://participate.test/#access_token=secret-token',
                  },
                ],
              }
            : { voteId: 'vote-1', message: '안내 문자' },
        ],
      ]);
      expect(result).toMatchObject({
        purpose: testCase.purpose,
        voteId: 'vote-1',
        recipientCount: 3,
        successCount: 2,
        failureCount: 1,
      });
      expect(smsDispatchRepository.save.mock.calls).toEqual([
        [
          expect.objectContaining({
            id: 'dispatch-1',
            voteId: 'vote-1',
            successCount: 2,
            failureCount: 1,
          }),
        ],
      ]);
    },
  );

  it('rejects a vote message in the wrong lifecycle state before sending', async () => {
    const smsSender = createSmsSender();
    const handler = new SendVoteSmsHandler(
      createVoteAccess(createVote(VoteStatus.Draft)),
      createEntitlementAccess(),
      createSmsDispatchRepository(),
      createParticipationReminderLinkIssuer(),
      smsSender,
    );

    await expect(
      handler.execute(
        SendVoteSmsCommand.of({
          voteId: 'vote-1',
          requestedByUserPrincipalId: 'creator-1',
          purpose: SmsMessagePurpose.VoteParticipationReminder,
          message: '참여해 주세요',
        }),
      ),
    ).rejects.toBeInstanceOf(DomainError);
    expectSmsSenderNotCalled(smsSender);
  });

  it('rejects non-creators before rotating participation links', async () => {
    const links = createParticipationReminderLinkIssuer();
    const smsSender = createSmsSender();
    const handler = new SendVoteSmsHandler(
      createVoteAccess(createVote(VoteStatus.Open)),
      createEntitlementAccess(),
      createSmsDispatchRepository(),
      links,
      smsSender,
    );

    await expect(
      handler.execute(
        SendVoteSmsCommand.of({
          voteId: 'vote-1',
          requestedByUserPrincipalId: 'another-user',
          purpose: SmsMessagePurpose.VoteParticipationReminder,
          message: '참여 안내',
        }),
      ),
    ).rejects.toBeInstanceOf(VoteSmsAccessDeniedError);
    expect(links.issueForNonParticipants.mock.calls).toHaveLength(0);
    expectSmsSenderNotCalled(smsSender);
  });

  it('does not issue invitation links or add ownership rules for other SMS purposes', async () => {
    const links = createParticipationReminderLinkIssuer();
    const handler = new SendVoteSmsHandler(
      createVoteAccess(createVote(VoteStatus.Closed)),
      createEntitlementAccess(),
      createSmsDispatchRepository(),
      links,
      createSmsSender(),
    );

    await handler.execute(
      SendVoteSmsCommand.of({
        voteId: 'vote-1',
        requestedByUserPrincipalId: 'another-user',
        purpose: SmsMessagePurpose.VoteResultNotice,
        message: '결과 안내',
      }),
    );

    expect(links.issueForNonParticipants.mock.calls).toHaveLength(0);
  });

  it('rejects invitation reminders when identity verification is required', async () => {
    const links = createParticipationReminderLinkIssuer();
    const smsSender = createSmsSender();
    const handler = new SendVoteSmsHandler(
      createVoteAccess(
        createVote(VoteStatus.Open, [VotingChannel.Online], true),
      ),
      createEntitlementAccess(),
      createSmsDispatchRepository(),
      links,
      smsSender,
    );

    await expect(
      handler.execute(
        SendVoteSmsCommand.of({
          voteId: 'vote-1',
          requestedByUserPrincipalId: 'creator-1',
          purpose: SmsMessagePurpose.VoteParticipationReminder,
          message: '참여 안내',
        }),
      ),
    ).rejects.toThrow(
      'participation reminders require optional identity verification',
    );
    expect(links.issueForNonParticipants.mock.calls).toHaveLength(0);
    expectSmsSenderNotCalled(smsSender);
  });

  it('rejects missing votes, blank messages, and an absent SMS adapter', async () => {
    await expect(
      new SendVoteSmsHandler(
        createVoteAccess(undefined),
        createEntitlementAccess(),
        createSmsDispatchRepository(),
        createParticipationReminderLinkIssuer(),
        createSmsSender(),
      ).execute(
        SendVoteSmsCommand.of({
          voteId: 'missing',
          requestedByUserPrincipalId: 'creator-1',
          purpose: SmsMessagePurpose.UpcomingVoteNotice,
          message: '예정 안내',
        }),
      ),
    ).rejects.toBeInstanceOf(ManagedResourceNotFoundError);
    expect(() =>
      SendVoteSmsCommand.of({
        voteId: 'vote-1',
        requestedByUserPrincipalId: 'creator-1',
        purpose: SmsMessagePurpose.UpcomingVoteNotice,
        message: '   ',
      }),
    ).toThrow(DomainError);
    await expect(
      new SendVoteSmsHandler(
        createVoteAccess(createVote(VoteStatus.Finalized)),
        createEntitlementAccess(),
        createSmsDispatchRepository(),
        createParticipationReminderLinkIssuer(),
      ).execute(
        SendVoteSmsCommand.of({
          voteId: 'vote-1',
          requestedByUserPrincipalId: 'creator-1',
          purpose: SmsMessagePurpose.UpcomingVoteNotice,
          message: '예정 안내',
        }),
      ),
    ).rejects.toBeInstanceOf(SmsSenderNotConfiguredError);
  });

  it('rejects an upcoming notice while the paid order is refund-pending', async () => {
    const smsSender = createSmsSender();
    const entitlement = createEntitlementAccess(false);
    const handler = new SendVoteSmsHandler(
      createVoteAccess(createVote(VoteStatus.Finalized)),
      entitlement,
      createSmsDispatchRepository(),
      createParticipationReminderLinkIssuer(),
      smsSender,
    );

    await expect(
      handler.execute(
        SendVoteSmsCommand.of({
          voteId: 'vote-1',
          requestedByUserPrincipalId: 'creator-1',
          purpose: SmsMessagePurpose.UpcomingVoteNotice,
          message: '예정 안내',
        }),
      ),
    ).rejects.toThrow(
      'upcoming vote notices require an active paid billing order',
    );
    expect(entitlement.hasPaidOrder.mock.calls).toEqual([['vote-1']]);
    expectSmsSenderNotCalled(smsSender);
  });

  it('sends a field-session notice only for an open vote with its field channel enabled', async () => {
    const smsSender = createSmsSender();
    const smsDispatchRepository = createSmsDispatchRepository();
    const handler = new SendFieldVotingSessionSmsHandler(
      createFieldSessionAccess(createSession(VotingChannel.Visit)),
      createVoteAccess(createVote(VoteStatus.Open, [VotingChannel.Visit])),
      smsDispatchRepository,
      smsSender,
    );

    const result = await handler.execute(
      SendFieldVotingSessionSmsCommand.of({
        fieldVotingSessionId: 'session-1',
        message: ' 방문 투표 장소 안내 ',
      }),
    );

    expect(smsSender.sendFieldVotingSessionNotice.mock.calls).toEqual([
      [
        {
          fieldVotingSessionId: 'session-1',
          voteId: 'vote-1',
          message: '방문 투표 장소 안내',
        },
      ],
    ]);
    expect(result).toMatchObject({
      smsDispatchId: 'dispatch-1',
      fieldVotingSessionId: 'session-1',
      voteId: 'vote-1',
      recipientCount: 3,
      successCount: 2,
      failureCount: 1,
    });
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(smsDispatchRepository.save.mock.calls).toEqual([
      [
        expect.objectContaining({
          fieldVotingSessionId: 'session-1',
          recipientCount: 3,
        }),
      ],
    ]);
  });

  it('rejects missing field sessions, disabled channels, and an absent SMS adapter', async () => {
    await expect(
      new SendFieldVotingSessionSmsHandler(
        createFieldSessionAccess(undefined),
        createVoteAccess(createVote(VoteStatus.Open)),
        createSmsDispatchRepository(),
        createSmsSender(),
      ).execute(
        SendFieldVotingSessionSmsCommand.of({
          fieldVotingSessionId: 'missing',
          message: '세션 안내',
        }),
      ),
    ).rejects.toBeInstanceOf(ManagedResourceNotFoundError);

    const smsSender = createSmsSender();
    await expect(
      new SendFieldVotingSessionSmsHandler(
        createFieldSessionAccess(createSession(VotingChannel.Onsite)),
        createVoteAccess(createVote(VoteStatus.Open, [VotingChannel.Online])),
        createSmsDispatchRepository(),
        smsSender,
      ).execute(
        SendFieldVotingSessionSmsCommand.of({
          fieldVotingSessionId: 'session-1',
          message: '세션 안내',
        }),
      ),
    ).rejects.toBeInstanceOf(DomainError);
    expectSmsSenderNotCalled(smsSender);

    await expect(
      new SendFieldVotingSessionSmsHandler(
        createFieldSessionAccess(createSession(VotingChannel.Onsite)),
        createVoteAccess(createVote(VoteStatus.Open, [VotingChannel.Onsite])),
        createSmsDispatchRepository(),
      ).execute(
        SendFieldVotingSessionSmsCommand.of({
          fieldVotingSessionId: 'session-1',
          message: '세션 안내',
        }),
      ),
    ).rejects.toBeInstanceOf(SmsSenderNotConfiguredError);
  });
});

function createSmsSender(): jest.Mocked<SmsSenderPort> {
  const result = {
    deliveries: [
      {
        electorId: 'elector-1',
        recipientName: '선거인 1',
        recipientIdentifier: 'member-1',
        status: SmsDeliveryStatus.Success,
      },
      {
        electorId: 'elector-2',
        recipientName: '선거인 2',
        recipientIdentifier: 'member-2',
        status: SmsDeliveryStatus.Success,
      },
      {
        electorId: 'elector-3',
        recipientName: '선거인 3',
        recipientIdentifier: 'member-3',
        status: SmsDeliveryStatus.Failure,
        failureReason: 'provider rejected the request',
      },
    ],
  } as const;

  return {
    sendParticipationReminderToNonParticipants: jest
      .fn()
      .mockResolvedValue(result),
    sendResultNotice: jest.fn().mockResolvedValue(result),
    sendUpcomingVoteNotice: jest.fn().mockResolvedValue(result),
    sendFieldVotingSessionNotice: jest.fn().mockResolvedValue(result),
  };
}

function createSmsDispatchRepository(): jest.Mocked<SmsDispatchRepositoryPort> {
  let sequence = 0;
  return {
    nextId: jest.fn(() =>
      sequence++ === 0 ? 'dispatch-1' : `delivery-${sequence}`,
    ),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function createVoteAccess(vote: VoteReference | undefined): VoteAccessPort {
  return { findById: jest.fn().mockResolvedValue(vote) };
}

function createEntitlementAccess(
  hasPaidOrder = true,
): jest.Mocked<VoteUsageEntitlementAccessPort> {
  return {
    hasPaidOrder: jest.fn().mockResolvedValue(hasPaidOrder),
    findPaidVoteIds: jest.fn().mockResolvedValue(new Set()),
  };
}

function createParticipationReminderLinkIssuer(): jest.Mocked<ParticipationReminderLinkIssuerPort> {
  return {
    issueForNonParticipants: jest.fn().mockResolvedValue([
      {
        electorId: 'elector-1',
        participationUrl: 'https://participate.test/#access_token=secret-token',
      },
    ]),
  };
}

function createFieldSessionAccess(
  session: FieldVotingSessionReference | undefined,
): FieldVotingSessionAccessPort {
  return { findById: jest.fn().mockResolvedValue(session) };
}

function createVote(
  status: VoteStatus,
  votingChannels: readonly VotingChannel[] = [VotingChannel.Online],
  identityVerificationRequired = false,
): VoteReference {
  return {
    id: 'vote-1',
    commissionId: 'commission-1',
    status,
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: identityVerificationRequired
      ? { required: true, provider: 'PASS', method: 'MOBILE' }
      : { required: false },
    allowsVotingChannel: (channel) => votingChannels.includes(channel),
    isCreatedBy: (userPrincipalId) => userPrincipalId === 'creator-1',
    hasElectoralRollSnapshot: () => false,
    usesElectoralRollSnapshot: () => false,
    assertElectorsMutable: () => undefined,
    assertParticipationAllowed: () => undefined,
  };
}

function createSession(channel: VotingChannel): FieldVotingSessionReference {
  return {
    id: 'session-1',
    commissionId: 'commission-1',
    voteId: 'vote-1',
    channel,
    status: FieldVotingSessionStatus.Scheduled,
    hasAssignedManager: () => true,
    belongsToVote: (voteId) => voteId === 'vote-1',
  };
}

function expectSmsSenderNotCalled(smsSender: jest.Mocked<SmsSenderPort>): void {
  expect(
    smsSender.sendParticipationReminderToNonParticipants.mock.calls,
  ).toHaveLength(0);
  expect(smsSender.sendResultNotice.mock.calls).toHaveLength(0);
  expect(smsSender.sendUpcomingVoteNotice.mock.calls).toHaveLength(0);
  expect(smsSender.sendFieldVotingSessionNotice.mock.calls).toHaveLength(0);
}
