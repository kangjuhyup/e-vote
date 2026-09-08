import type { VoteAccessPort } from '../../../../src/shared/application/port/capability/vote-access.port';
import type { DevelopmentParticipationLinkReadPort } from '../../../../src/modules/participation/application/port/persistence/query/development-participation-link-read.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import { GetDevelopmentParticipationLinkQuery } from '../../../../src/modules/participation/application/query/dto/request/get-development-participation-link.query';
import {
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
  DevelopmentParticipationLinkNotFoundError,
  DevelopmentParticipationLinkVoteNotFoundError,
} from '../../../../src/modules/participation/application/query/development-participation-link.error';
import { GetDevelopmentParticipationLinkHandler } from '../../../../src/modules/participation/application/query/handler/get-development-participation-link.handler';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies injected collaborator mocks without invoking detached methods. */

describe('GetDevelopmentParticipationLinkHandler', () => {
  const query = GetDevelopmentParticipationLinkQuery.of({
    voteId: 'vote-1',
    electorId: 'elector-1',
    requestedByUserPrincipalId: 'creator-1',
  });
  const invitation = {
    id: 'invitation-1',
    voteId: 'vote-1',
    electorId: 'elector-1',
    tokenDigest: 'current-digest',
    signingKeyId: 'current',
    generation: 2,
  };

  function createSubject(options?: {
    vote?: ReturnType<typeof voteReference>;
    invitation?: typeof invitation;
    issued?: { token: string; tokenDigest: string; keyId: string };
  }) {
    const votes = {
      findById: jest
        .fn()
        .mockResolvedValue(
          options && 'vote' in options ? options.vote : voteReference(true),
        ),
    } as jest.Mocked<VoteAccessPort>;
    const links = {
      findCurrentInvitation: jest
        .fn()
        .mockResolvedValue(
          options && 'invitation' in options ? options.invitation : invitation,
        ),
    } as jest.Mocked<DevelopmentParticipationLinkReadPort>;
    const tokens = {
      issueReference: jest.fn().mockReturnValue(
        options?.issued ?? {
          token: 'signed-reference',
          tokenDigest: 'current-digest',
          keyId: 'current',
        },
      ),
    } as unknown as jest.Mocked<ParticipationAccessTokenPort>;
    return {
      handler: new GetDevelopmentParticipationLinkHandler(
        votes,
        links,
        tokens,
        'http://localhost:3001/participate/#ignored',
      ),
      votes,
      links,
      tokens,
    };
  }

  it('reconstructs the current stored invitation without changing it', async () => {
    const { handler, links, tokens } = createSubject();

    await expect(handler.execute(query)).resolves.toEqual({
      electorId: 'elector-1',
      participationUrl:
        'http://localhost:3001/participate#access_token=signed-reference',
    });
    expect(links.findCurrentInvitation).toHaveBeenCalledWith({
      voteId: 'vote-1',
      electorId: 'elector-1',
    });
    expect(tokens.issueReference).toHaveBeenCalledWith('invitation-1', 2);
  });

  it('rejects access before reading invitation data when requester is not the creator', async () => {
    const { handler, links } = createSubject({ vote: voteReference(false) });

    await expect(handler.execute(query)).rejects.toBeInstanceOf(
      DevelopmentParticipationLinkAccessDeniedError,
    );
    expect(links.findCurrentInvitation).not.toHaveBeenCalled();
  });

  it('does not reveal whether an invitation exists when the vote is missing', async () => {
    const { handler, links } = createSubject({ vote: undefined });

    await expect(handler.execute(query)).rejects.toBeInstanceOf(
      DevelopmentParticipationLinkVoteNotFoundError,
    );
    expect(links.findCurrentInvitation).not.toHaveBeenCalled();
  });

  it('returns not found when no current invitation exists', async () => {
    const { handler } = createSubject({ invitation: undefined });

    await expect(handler.execute(query)).rejects.toBeInstanceOf(
      DevelopmentParticipationLinkNotFoundError,
    );
  });

  it('requires reissue when reconstructed credentials do not match storage', async () => {
    const { handler } = createSubject({
      issued: {
        token: 'different-reference',
        tokenDigest: 'different-digest',
        keyId: 'current',
      },
    });

    await expect(handler.execute(query)).rejects.toBeInstanceOf(
      DevelopmentParticipationLinkMismatchError,
    );
  });
});

function voteReference(createdByRequester: boolean) {
  return {
    id: 'vote-1',
    isCreatedBy: jest.fn().mockReturnValue(createdByRequester),
  } as unknown as Awaited<ReturnType<VoteAccessPort['findById']>>;
}
