import { IssueParticipationReminderLinksHandler } from '../../../../src/modules/participation/application/command/handler/issue-participation-reminder-links.handler';
import type { ParticipationAccessRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-access-repository.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import { ParticipationInvitationAggregate } from '../../../../src/modules/participation/domain/access/participation-invitation.aggregate';
import type { SmsRecipientAccessPort } from '../../../../src/shared/application/port/capability/sms-recipient-access.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';

describe('IssueParticipationReminderLinksHandler', () => {
  const recipients = {
    findPage: jest.fn(),
  } satisfies jest.Mocked<SmsRecipientAccessPort>;
  const access = {
    nextId: jest.fn(),
    findInvitationByElectorForUpdate: jest.fn(),
    findInvitationsByElectorsForUpdate: jest.fn(),
    findInvitationByIdForUpdate: jest.fn(),
    findInvitationById: jest.fn(),
    saveInvitation: jest.fn(),
    saveInvitations: jest.fn(),
    findSessionByTokenDigest: jest.fn(),
    findSessionById: jest.fn(),
    saveSession: jest.fn(),
    revokeSessionsForInvitation: jest.fn(),
    revokeSessionsForInvitations: jest.fn(),
    revokeSessionByTokenDigest: jest.fn(),
    revokeAccessForVote: jest.fn(),
    revokeAccessForElector: jest.fn(),
    enqueueDelivery: jest.fn(),
    enqueueDeliveries: jest.fn(),
    claimDeliveryBatch: jest.fn(),
    markDeliverySent: jest.fn(),
    markDeliverySkipped: jest.fn(),
    rescheduleDelivery: jest.fn(),
    markDeliveryDead: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessRepositoryPort>;
  const tokens = {
    issueReference: jest.fn(),
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
    recipients.findPage
      .mockResolvedValueOnce({
        items: [
          recipient('elector-existing'),
          recipient('elector-participated', { participated: true }),
          recipient('elector-blocked', { status: ElectorStatus.Blocked }),
        ],
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [recipient('elector-new'), recipient('elector-existing')],
        totalPages: 2,
      });
    access.nextId.mockReturnValue('invitation-new');
    access.findInvitationsByElectorsForUpdate.mockResolvedValue([
      existingInvitation(),
    ]);
    access.revokeSessionsForInvitations.mockResolvedValue(undefined);
    access.saveInvitations.mockResolvedValue(undefined);
    tokens.issueReference.mockImplementation((invitationId, generation) => ({
      token: `token-${invitationId}-${generation}`,
      tokenDigest: `digest-${invitationId}-${generation}`,
      keyId: 'key-current',
    }));
  });

  it('rotates every eligible nonparticipant link and revokes prior sessions', async () => {
    const handler = new IssueParticipationReminderLinksHandler(
      recipients,
      access,
      tokens,
      'https://vote.example.test/participate/',
      transactions,
    );

    const links = await handler.issueForNonParticipants({
      voteId: 'vote-1',
      issuedByUserPrincipalId: 'creator-1',
    });

    expect(recipients.findPage.mock.calls).toEqual([
      [{ voteId: 'vote-1', page: 1, pageSize: 100 }],
      [{ voteId: 'vote-1', page: 2, pageSize: 100 }],
    ]);
    expect(access.findInvitationsByElectorsForUpdate).toHaveBeenCalledWith(
      'vote-1',
      ['elector-existing', 'elector-new'],
    );
    expect(tokens.issueReference.mock.calls).toEqual([
      ['invitation-existing', 3],
      ['invitation-new', 1],
    ]);
    expect(access.revokeSessionsForInvitations).toHaveBeenCalledWith(
      ['invitation-existing'],
      expect.any(Date),
    );
    expect(access.saveInvitations).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'invitation-existing',
        electorId: 'elector-existing',
        generation: 3,
        claimedAt: undefined,
        claimedSessionId: undefined,
        issuedByUserPrincipalId: 'creator-1',
      }),
      expect.objectContaining({
        id: 'invitation-new',
        electorId: 'elector-new',
        generation: 1,
        issuedByUserPrincipalId: 'creator-1',
      }),
    ]);
    expect(links).toEqual([
      {
        electorId: 'elector-existing',
        participationUrl:
          'https://vote.example.test/participate#access_token=token-invitation-existing-3',
      },
      {
        electorId: 'elector-new',
        participationUrl:
          'https://vote.example.test/participate#access_token=token-invitation-new-1',
      },
    ]);
    expect(access.enqueueDelivery).not.toHaveBeenCalled();
    expect(access.enqueueDeliveries).not.toHaveBeenCalled();
  });

  it('persists an empty batch when there are no eligible nonparticipants', async () => {
    recipients.findPage.mockReset().mockResolvedValue({
      items: [recipient('elector-1', { participated: true })],
      totalPages: 1,
    });
    access.findInvitationsByElectorsForUpdate.mockResolvedValue([]);
    const handler = new IssueParticipationReminderLinksHandler(
      recipients,
      access,
      tokens,
      'https://vote.example.test/participate',
      transactions,
    );

    await expect(
      handler.issueForNonParticipants({
        voteId: 'vote-1',
        issuedByUserPrincipalId: 'creator-1',
      }),
    ).resolves.toEqual([]);
    expect(tokens.issueReference).not.toHaveBeenCalled();
    expect(access.revokeSessionsForInvitations).toHaveBeenCalledWith(
      [],
      expect.any(Date),
    );
    expect(access.saveInvitations).toHaveBeenCalledWith([]);
  });
});

function recipient(
  electorId: string,
  overrides: {
    readonly status?: ElectorStatus;
    readonly participated?: boolean;
  } = {},
) {
  return {
    electorId,
    name: `elector ${electorId}`,
    identifier: `member-${electorId}`,
    status: overrides.status ?? ElectorStatus.Eligible,
    participated: overrides.participated ?? false,
  };
}

function existingInvitation(): ParticipationInvitationAggregate {
  return ParticipationInvitationAggregate.reconstitute({
    id: 'invitation-existing',
    voteId: 'vote-1',
    electorId: 'elector-existing',
    tokenDigest: 'old-digest',
    signingKeyId: 'old-key',
    generation: 2,
    claimedAt: new Date('2026-09-07T00:00:00.000Z'),
    claimedSessionId: 'old-session',
    issuedByUserPrincipalId: 'creator-1',
    createdAt: new Date('2026-09-06T00:00:00.000Z'),
    updatedAt: new Date('2026-09-07T00:00:00.000Z'),
  });
}
