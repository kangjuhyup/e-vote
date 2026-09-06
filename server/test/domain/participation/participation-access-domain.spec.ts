import {
  InvalidParticipationInvitationError,
  ParticipationInvitationAlreadyClaimedError,
  ParticipantSessionExpiredError,
  ParticipantSessionScopeDeniedError,
} from '../../../src/modules/participation/domain/access/participation-access.error';
import { ElectorParticipantSessionAggregate } from '../../../src/modules/participation/domain/access/elector-participant-session.aggregate';
import { ParticipationInvitationAggregate } from '../../../src/modules/participation/domain/access/participation-invitation.aggregate';

describe('participation access domain', () => {
  const now = new Date('2026-09-06T00:00:00.000Z');

  function issueInvitation(): ParticipationInvitationAggregate {
    return ParticipationInvitationAggregate.issue({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'digest-1',
      signingKeyId: 'current',
      issuedByUserPrincipalId: 'user-1',
      now,
    });
  }

  it('allows exactly one browser claim for a current generation', () => {
    const invitation = issueInvitation();

    invitation.claimForParticipation('session-a', now);

    expect(() => invitation.claimForParticipation('session-b', now)).toThrow(
      ParticipationInvitationAlreadyClaimedError,
    );
    expect(() =>
      invitation.claimForParticipation('session-a', now),
    ).not.toThrow();
  });

  it('rotates without a time expiry and invalidates the old generation', () => {
    const invitation = issueInvitation();

    invitation.rotate({
      tokenDigest: 'digest-2',
      signingKeyId: 'next',
      issuedByUserPrincipalId: 'user-2',
      now: new Date('2036-09-06T00:00:00.000Z'),
    });

    expect(invitation.generation).toBe(2);
    expect(invitation.claimedSessionId).toBeUndefined();
    expect(() => invitation.assertCurrentToken(1, 'digest-1')).toThrow(
      InvalidParticipationInvitationError,
    );
    expect(() => invitation.assertCurrentToken(2, 'digest-2')).not.toThrow();
  });

  it('keeps a current invitation valid for result access without an expiry', () => {
    const invitation = issueInvitation();

    invitation.claimForParticipation('session-a', now);

    expect(() =>
      invitation.assertResultAccessAllowed(1, 'digest-1'),
    ).not.toThrow();
  });

  it('revocation invalidates participation and result access', () => {
    const invitation = issueInvitation();

    invitation.revoke(now);

    expect(() => invitation.assertCurrentToken(1, 'digest-1')).toThrow(
      InvalidParticipationInvitationError,
    );
    expect(() => invitation.assertResultAccessAllowed(1, 'digest-1')).toThrow(
      InvalidParticipationInvitationError,
    );
  });

  it('limits participation sessions to participation scope and vote end', () => {
    const session = ElectorParticipantSessionAggregate.issueParticipation({
      id: 'session-1',
      tokenDigest: 'session-digest',
      csrfTokenDigest: 'csrf-digest',
      invitationId: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      invitationGeneration: 1,
      expiresAt: new Date('2026-09-06T01:00:00.000Z'),
      now,
    });

    expect(() =>
      session.assertUsable({
        expectedScope: 'PARTICIPATE',
        invitationGeneration: 1,
        now: new Date('2026-09-06T00:59:59.000Z'),
      }),
    ).not.toThrow();
    expect(() =>
      session.assertUsable({
        expectedScope: 'RESULT_READ',
        invitationGeneration: 1,
        now,
      }),
    ).toThrow(ParticipantSessionScopeDeniedError);
    expect(() =>
      session.assertUsable({
        expectedScope: 'PARTICIPATE',
        invitationGeneration: 1,
        now: new Date('2026-09-06T01:00:00.000Z'),
      }),
    ).toThrow(ParticipantSessionExpiredError);
  });

  it('issues rolling result-read sessions without granting mutations', () => {
    const session = ElectorParticipantSessionAggregate.issueResultRead({
      id: 'session-2',
      tokenDigest: 'session-digest',
      csrfTokenDigest: 'csrf-digest',
      invitationId: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      invitationGeneration: 3,
      expiresAt: new Date('2026-10-06T00:00:00.000Z'),
      now,
    });

    expect(() =>
      session.assertUsable({
        expectedScope: 'RESULT_READ',
        invitationGeneration: 3,
        now,
      }),
    ).not.toThrow();
    expect(() =>
      session.assertUsable({
        expectedScope: 'PARTICIPATE',
        invitationGeneration: 3,
        now,
      }),
    ).toThrow(ParticipantSessionScopeDeniedError);
  });
});
