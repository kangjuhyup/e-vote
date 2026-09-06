import { DomainError } from '../../../src/shared/domain/domain-error';
import {
  ParticipationInvitationAggregate,
  ParticipationInvitationUnavailableError,
} from '../../../src/modules/participation/domain/participation-invitation.aggregate';

describe('participation invitation domain', () => {
  const now = new Date('2026-09-05T00:00:00.000Z');

  function create() {
    return ParticipationInvitationAggregate.create({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'digest-1',
      expiresAt: new Date('2026-09-06T00:00:00.000Z'),
      now,
    });
  }

  it('binds an active invitation to one vote and elector', () => {
    const invitation = create();
    expect(() => invitation.assertUsable(now)).not.toThrow();
    expect(invitation).toMatchObject({
      voteId: 'vote-1',
      electorId: 'elector-1',
    });
  });

  it('rejects expired and revoked invitations', () => {
    const expired = create();
    expect(() =>
      expired.assertUsable(new Date('2026-09-06T00:00:00.000Z')),
    ).toThrow(ParticipationInvitationUnavailableError);

    const revoked = create();
    revoked.revoke(new Date('2026-09-05T01:00:00.000Z'));
    expect(() => revoked.assertUsable(now)).toThrow(
      ParticipationInvitationUnavailableError,
    );
  });

  it('requires a future expiry and rotates the credential', () => {
    expect(() =>
      ParticipationInvitationAggregate.create({
        id: 'invitation-2',
        voteId: 'vote-1',
        electorId: 'elector-1',
        tokenDigest: 'digest',
        expiresAt: now,
        now,
      }),
    ).toThrow(DomainError);

    const invitation = create();
    invitation.rotate(
      'digest-2',
      new Date('2026-09-07T00:00:00.000Z'),
      new Date('2026-09-05T01:00:00.000Z'),
    );
    expect(invitation.tokenDigest).toBe('digest-2');
    expect(invitation.revokedAt).toBeUndefined();
  });
});
