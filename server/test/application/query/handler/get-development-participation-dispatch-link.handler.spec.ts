import { GetDevelopmentParticipationDispatchLinkQuery } from '../../../../src/modules/participation/application/query/dto/request/get-development-participation-dispatch-link.query';
import {
  DevelopmentParticipationDispatchLinkNotFoundError,
  DevelopmentParticipationDispatchLinkStaleError,
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
} from '../../../../src/modules/participation/application/query/development-participation-link.error';
import { GetDevelopmentParticipationDispatchLinkHandler } from '../../../../src/modules/participation/application/query/handler/get-development-participation-dispatch-link.handler';
import type { DevelopmentParticipationLinkReadPort } from '../../../../src/modules/participation/application/port/persistence/query/development-participation-link-read.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import type { VoteAccessPort } from '../../../../src/shared/application/port/capability/vote-access.port';

describe('GetDevelopmentParticipationDispatchLinkHandler', () => {
  const query = GetDevelopmentParticipationDispatchLinkQuery.of({
    voteId: 'vote-1',
    smsDispatchId: 'dispatch-1',
    electorId: 'elector-1',
    requestedByUserPrincipalId: 'creator-1',
  });
  const invitation = {
    id: 'invitation-1',
    voteId: 'vote-1',
    electorId: 'elector-1',
    tokenDigest: 'digest-3',
    signingKeyId: 'current',
    generation: 3,
  };

  function subject(params?: {
    owner?: boolean;
    dispatch?: Awaited<
      ReturnType<DevelopmentParticipationLinkReadPort['findDispatchInvitation']>
    >;
    tokenDigest?: string;
  }) {
    const votes = {
      findById: jest.fn().mockResolvedValue({
        id: 'vote-1',
        isCreatedBy: () => params?.owner ?? true,
      }),
    } as unknown as jest.Mocked<VoteAccessPort>;
    const links = {
      findCurrentInvitation: jest.fn(),
      findDispatchInvitation: jest.fn().mockResolvedValue(
        params && 'dispatch' in params
          ? params.dispatch
          : {
              invitationGeneration: 3,
              currentInvitation: invitation,
            },
      ),
    } as jest.Mocked<DevelopmentParticipationLinkReadPort>;
    const tokens = {
      issueReference: jest.fn().mockReturnValue({
        token: 'reference-3',
        tokenDigest: params?.tokenDigest ?? 'digest-3',
        keyId: 'current',
      }),
    } as unknown as jest.Mocked<ParticipationAccessTokenPort>;
    return {
      handler: new GetDevelopmentParticipationDispatchLinkHandler(
        votes,
        links,
        tokens,
        'https://vote.example.test/participate/',
      ),
      links,
      tokens,
    };
  }

  it('returns the link only when the delivery generation is still current', async () => {
    const { handler, links, tokens } = subject();

    await expect(handler.execute(query)).resolves.toEqual({
      electorId: 'elector-1',
      participationUrl:
        'https://vote.example.test/participate#access_token=reference-3',
    });
    expect(links.findDispatchInvitation.mock.calls).toEqual([
      [
        {
          voteId: 'vote-1',
          smsDispatchId: 'dispatch-1',
          electorId: 'elector-1',
        },
      ],
    ]);
    expect(tokens.issueReference.mock.calls).toEqual([['invitation-1', 3]]);
  });

  it.each([
    undefined,
    { currentInvitation: invitation },
    { invitationGeneration: 2, currentInvitation: invitation },
    { invitationGeneration: 3 },
  ])(
    'rejects missing, legacy, rotated, or revoked dispatch links',
    async (dispatch) => {
      const { handler } = subject({ dispatch });

      await expect(handler.execute(query)).rejects.toBeInstanceOf(
        dispatch === undefined
          ? DevelopmentParticipationDispatchLinkNotFoundError
          : DevelopmentParticipationDispatchLinkStaleError,
      );
    },
  );

  it('checks vote ownership before reading dispatch data', async () => {
    const { handler, links } = subject({ owner: false });

    await expect(handler.execute(query)).rejects.toBeInstanceOf(
      DevelopmentParticipationLinkAccessDeniedError,
    );
    expect(links.findDispatchInvitation.mock.calls).toHaveLength(0);
  });

  it('rejects a reconstructed token that does not match storage', async () => {
    const { handler } = subject({ tokenDigest: 'different-digest' });

    await expect(handler.execute(query)).rejects.toBeInstanceOf(
      DevelopmentParticipationLinkMismatchError,
    );
  });
});
