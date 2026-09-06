import { ProcessParticipationInvitationDeliveryHandler } from '../../../../src/modules/participation/application/command/handler/process-participation-invitation-delivery.handler';
import { ParticipationInvitationAggregate } from '../../../../src/modules/participation/domain/access/participation-invitation.aggregate';
import type { ParticipationAccessRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-access-repository.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import type { ParticipationInvitationSmsSenderPort } from '../../../../src/modules/participation/application/port/gateway/participation-invitation-sms-sender.port';
import type { ParticipationInvitationRecipientAccessPort } from '../../../../src/modules/participation/application/port/capability/participation-invitation-recipient-access.port';

describe('ProcessParticipationInvitationDeliveryHandler', () => {
  const delivery = {
    id: 'delivery-1',
    invitationId: 'invitation-1',
    invitationGeneration: 1,
    lockToken: 'lock-1',
    attemptCount: 1,
  };
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
    markDeliverySent: jest.fn().mockResolvedValue(true),
    markDeliverySkipped: jest.fn().mockResolvedValue(true),
    rescheduleDelivery: jest.fn(),
    markDeliveryDead: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessRepositoryPort>;
  const recipients = {
    findEligibleRecipients: jest.fn(),
    findPhoneNumber: jest
      .fn()
      .mockResolvedValue('encrypted-data-was-decrypted-by-repository'),
  } satisfies jest.Mocked<ParticipationInvitationRecipientAccessPort>;
  const tokens = {
    issueReference: jest.fn().mockReturnValue({
      token: 'signed-reference',
      tokenDigest: 'reference-digest',
      keyId: 'current',
    }),
    verifyReference: jest.fn(),
    issueSessionCredentials: jest.fn(),
    deriveCsrfToken: jest.fn(),
    digest: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessTokenPort>;
  const sender = {
    send: jest.fn().mockResolvedValue(undefined),
  } satisfies jest.Mocked<ParticipationInvitationSmsSenderPort>;

  beforeEach(() => jest.clearAllMocks());

  it('acknowledges a stale generation without sending', async () => {
    access.findInvitationById.mockResolvedValueOnce(invitation(2));
    const handler = createHandler();

    await handler.execute(delivery, new Date('2026-09-06T00:00:00.000Z'));

    expect(sender.send).not.toHaveBeenCalled();
    expect(access.markDeliverySkipped).toHaveBeenCalledWith({
      id: 'delivery-1',
      lockToken: 'lock-1',
      reason: 'STALE_GENERATION',
      now: new Date('2026-09-06T00:00:00.000Z'),
    });
  });

  it('sends the permanent fragment link with a stable provider idempotency key', async () => {
    access.findInvitationById.mockResolvedValueOnce(invitation(1));
    const handler = createHandler();

    await handler.execute(delivery, new Date('2026-09-06T00:00:00.000Z'));

    expect(sender.send).toHaveBeenCalledWith({
      phoneNumber: 'encrypted-data-was-decrypted-by-repository',
      message:
        '투표 참여 링크: https://vote.example/participate#access_token=signed-reference',
      idempotencyKey: 'participation-invitation:invitation-1:1',
    });
    expect(access.markDeliverySent).toHaveBeenCalledWith({
      id: 'delivery-1',
      lockToken: 'lock-1',
      now: new Date('2026-09-06T00:00:00.000Z'),
    });
  });

  function createHandler() {
    return new ProcessParticipationInvitationDeliveryHandler(
      access,
      recipients,
      tokens,
      sender,
      'https://vote.example/participate',
    );
  }

  function invitation(generation: number) {
    return ParticipationInvitationAggregate.reconstitute({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'reference-digest',
      signingKeyId: 'current',
      generation,
      issuedByUserPrincipalId: 'creator-1',
      createdAt: new Date('2026-09-06T00:00:00.000Z'),
      updatedAt: new Date('2026-09-06T00:00:00.000Z'),
    });
  }
});
