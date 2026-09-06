import { ElectorParticipantSessionAggregate } from '../../../../src/modules/participation/domain/access/elector-participant-session.aggregate';
import { ParticipationInvitationAggregate } from '../../../../src/modules/participation/domain/access/participation-invitation.aggregate';
import { ParticipationAccessMapper } from '../../../../src/modules/participation/infrastructure/database/mapper/participation-access.mapper';

describe('ParticipationAccessMapper', () => {
  it('round trips a permanent invitation without synthesizing an expiry', () => {
    const invitation = ParticipationInvitationAggregate.issue({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'token-digest',
      signingKeyId: 'current',
      issuedByUserPrincipalId: 'user-1',
      now: new Date('2026-09-06T00:00:00.000Z'),
    });

    const persistence =
      ParticipationAccessMapper.invitationToPersistence(invitation);
    const restored = ParticipationAccessMapper.invitationToDomain(persistence);

    expect(persistence.expiresAt).toBeNull();
    expect(restored).toMatchObject({
      id: 'invitation-1',
      generation: 1,
      tokenDigest: 'token-digest',
      revokedAt: undefined,
    });
  });

  it('round trips an opaque participant session using relation identifiers', () => {
    const session = ElectorParticipantSessionAggregate.issueParticipation({
      id: 'session-1',
      tokenDigest: 'session-digest',
      csrfTokenDigest: 'csrf-digest',
      invitationId: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      invitationGeneration: 1,
      expiresAt: new Date('2026-09-06T01:00:00.000Z'),
      now: new Date('2026-09-06T00:00:00.000Z'),
    });

    const persistence = ParticipationAccessMapper.sessionToPersistence(session);
    const restored = ParticipationAccessMapper.sessionToDomain(persistence);

    expect(restored).toMatchObject({
      id: 'session-1',
      invitationId: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      scope: 'PARTICIPATE',
    });
  });
});
