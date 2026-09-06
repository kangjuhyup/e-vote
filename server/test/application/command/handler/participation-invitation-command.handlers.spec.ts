import { DispatchParticipationInvitationsCommand } from '../../../../src/modules/participation/application/command/dto/request/dispatch-participation-invitations.command';
import {
  ParticipationInvitationAccessDeniedError,
  ParticipationInvitationIdentityPolicyError,
  ParticipationInvitationStateError,
} from '../../../../src/modules/participation/application/command/participation-invitation.error';
import { DispatchParticipationInvitationsHandler } from '../../../../src/modules/participation/application/command/handler/dispatch-participation-invitations.handler';
import type { ParticipationAccessRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-access-repository.port';
import type { ParticipationInvitationRecipientAccessPort } from '../../../../src/modules/participation/application/port/capability/participation-invitation-recipient-access.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('DispatchParticipationInvitationsHandler', () => {
  const voteId = 'vote-1';
  const command = DispatchParticipationInvitationsCommand.of({
    voteId,
    requestedByUserPrincipalId: 'creator-1',
  });
  const accessRepository = {
    nextId: jest.fn(),
    findInvitationByElectorForUpdate: jest.fn().mockResolvedValue(undefined),
    findInvitationsByElectorsForUpdate: jest.fn().mockResolvedValue([]),
    saveInvitation: jest.fn().mockResolvedValue(undefined),
    saveInvitations: jest.fn().mockResolvedValue(undefined),
    saveSession: jest.fn(),
    findInvitationByIdForUpdate: jest.fn(),
    findInvitationById: jest.fn(),
    findSessionByTokenDigest: jest.fn(),
    findSessionById: jest.fn(),
    revokeSessionsForInvitation: jest.fn(),
    revokeSessionsForInvitations: jest.fn().mockResolvedValue(undefined),
    revokeSessionByTokenDigest: jest.fn(),
    revokeAccessForVote: jest.fn(),
    revokeAccessForElector: jest.fn(),
    enqueueDelivery: jest.fn().mockResolvedValue(undefined),
    enqueueDeliveries: jest
      .fn<
        ReturnType<ParticipationAccessRepositoryPort['enqueueDeliveries']>,
        Parameters<ParticipationAccessRepositoryPort['enqueueDeliveries']>
      >()
      .mockResolvedValue(undefined),
    claimDeliveryBatch: jest.fn(),
    markDeliverySent: jest.fn(),
    markDeliverySkipped: jest.fn(),
    rescheduleDelivery: jest.fn(),
    markDeliveryDead: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessRepositoryPort>;
  const recipients = {
    findEligibleRecipients: jest
      .fn()
      .mockResolvedValue([{ electorId: 'elector-1', hasPhoneNumber: true }]),
  } satisfies jest.Mocked<ParticipationInvitationRecipientAccessPort>;
  const tokens = {
    issueReference: jest.fn().mockReturnValue({
      token: 'not-persisted',
      tokenDigest: 'token-digest',
      keyId: 'current',
    }),
    verifyReference: jest.fn(),
    issueSessionCredentials: jest.fn(),
    deriveCsrfToken: jest.fn(),
    digest: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessTokenPort>;
  const transactions = {
    runInTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
  } satisfies jest.Mocked<DatabaseTransactionManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    let idIndex = 0;
    const ids = ['invitation-1', 'delivery-1', 'invitation-2', 'delivery-2'];
    accessRepository.nextId.mockImplementation(
      () => ids[idIndex++] ?? `id-${idIndex}`,
    );
    accessRepository.findInvitationsByElectorsForUpdate.mockResolvedValue([]);
    recipients.findEligibleRecipients.mockResolvedValue([
      { electorId: 'elector-1', hasPhoneNumber: true },
    ]);
  });

  it('rejects a non-creator', async () => {
    const handler = createHandler(vote({ creator: 'another-user' }));

    await expect(handler.execute(command)).rejects.toThrow(
      ParticipationInvitationAccessDeniedError,
    );
    expect(accessRepository.saveInvitations).not.toHaveBeenCalled();
  });

  it('rejects votes that require external identity verification', async () => {
    const handler = createHandler(vote({ identityRequired: true }));

    await expect(handler.execute(command)).rejects.toThrow(
      ParticipationInvitationIdentityPolicyError,
    );
  });

  it.each([VoteStatus.Draft, VoteStatus.Canceled])(
    'rejects dispatch while vote is %s',
    async (status) => {
      const handler = createHandler(vote({ status }));

      await expect(handler.execute(command)).rejects.toThrow(
        ParticipationInvitationStateError,
      );
    },
  );

  it('persists a permanent invitation and durable delivery without sending SMS', async () => {
    const handler = createHandler(vote({ status: VoteStatus.Finalized }));

    const result = await handler.execute(command);

    expect(tokens.issueReference).toHaveBeenCalledWith('invitation-1', 1);
    expect(accessRepository.saveInvitations).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'invitation-1',
        voteId,
        electorId: 'elector-1',
        tokenDigest: 'token-digest',
      }),
    ]);
    const [deliveries] = accessRepository.enqueueDeliveries.mock.calls[0];
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      id: 'delivery-1',
      invitationId: 'invitation-1',
      invitationGeneration: 1,
      status: 'PENDING',
    });
    expect(deliveries[0]?.now).toBeInstanceOf(Date);
    expect(result).toEqual({ totalCount: 1, queuedCount: 1, skippedCount: 0 });
  });

  it('records no-phone recipients as skipped without issuing a link', async () => {
    recipients.findEligibleRecipients.mockResolvedValueOnce([
      { electorId: 'elector-1', hasPhoneNumber: false },
    ]);
    const handler = createHandler(vote({ status: VoteStatus.Open }));

    const result = await handler.execute(command);

    expect(tokens.issueReference).not.toHaveBeenCalled();
    expect(accessRepository.saveInvitations).toHaveBeenCalledWith([]);
    expect(result).toEqual({ totalCount: 1, queuedCount: 0, skippedCount: 1 });
  });

  it('uses bounded bulk repository calls rather than one query per elector', async () => {
    recipients.findEligibleRecipients.mockResolvedValueOnce([
      { electorId: 'elector-1', hasPhoneNumber: true },
      { electorId: 'elector-2', hasPhoneNumber: true },
    ]);
    const handler = createHandler(vote({ status: VoteStatus.Finalized }));

    await handler.execute(command);

    expect(
      accessRepository.findInvitationsByElectorsForUpdate,
    ).toHaveBeenCalledTimes(1);
    expect(accessRepository.saveInvitations).toHaveBeenCalledTimes(1);
    expect(accessRepository.enqueueDeliveries).toHaveBeenCalledTimes(1);
    expect(
      accessRepository.findInvitationByElectorForUpdate,
    ).not.toHaveBeenCalled();
    expect(accessRepository.saveInvitation).not.toHaveBeenCalled();
    expect(accessRepository.enqueueDelivery).not.toHaveBeenCalled();
  });

  function createHandler(sourceVote: VoteAggregate) {
    const votes = {
      nextId: jest.fn(),
      findById: jest.fn().mockResolvedValue(sourceVote),
      save: jest.fn(),
    } satisfies jest.Mocked<VoteRepositoryPort>;
    return new DispatchParticipationInvitationsHandler(
      votes,
      recipients,
      accessRepository,
      tokens,
      transactions,
    );
  }

  function vote(params: {
    creator?: string;
    identityRequired?: boolean;
    status?: (typeof VoteStatus)[keyof typeof VoteStatus];
  }): VoteAggregate {
    const identityRequired = params.identityRequired ?? false;
    return VoteAggregate.reconstitute({
      id: voteId,
      createdByUserPrincipalId: params.creator ?? 'creator-1',
      commissionId: 'commission-1',
      title: 'Vote',
      votingChannels: [VotingChannel.Online],
      defaultPolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of(
        identityRequired
          ? { required: true, provider: 'PASS', method: 'MOBILE' }
          : { required: false },
      ),
      startedAt: new Date('2026-09-06T00:00:00.000Z'),
      endedAt: new Date('2026-09-07T00:00:00.000Z'),
      status: params.status ?? VoteStatus.Finalized,
      billingOrderId:
        (params.status ?? VoteStatus.Finalized) === VoteStatus.Draft
          ? undefined
          : 'billing-1',
      finalizedAt:
        (params.status ?? VoteStatus.Finalized) === VoteStatus.Draft
          ? undefined
          : new Date('2026-09-05T00:00:00.000Z'),
    });
  }
});
