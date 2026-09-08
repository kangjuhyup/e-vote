import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DevelopmentParticipationDispatchLinkNotFoundError,
  DevelopmentParticipationDispatchLinkStaleError,
  DevelopmentParticipationLinkAccessDeniedError,
} from '../../../../src/modules/participation/application/query/development-participation-link.error';
import type { GetDevelopmentParticipationDispatchLinkHandler } from '../../../../src/modules/participation/application/query/handler/get-development-participation-dispatch-link.handler';
import { ParticipationAccessNotConfiguredError } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import { DevelopmentParticipationDispatchLinkController } from '../../../../src/modules/participation/presentation/development-participation-link/development-participation-dispatch-link.controller';
import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';

describe('DevelopmentParticipationDispatchLinkController', () => {
  const execute = jest.fn<
    ReturnType<GetDevelopmentParticipationDispatchLinkHandler['execute']>,
    Parameters<GetDevelopmentParticipationDispatchLinkHandler['execute']>
  >();
  const controller = new DevelopmentParticipationDispatchLinkController({
    execute,
  } as unknown as GetDevelopmentParticipationDispatchLinkHandler);
  const params = {
    voteId: 'vote-1',
    smsDispatchId: 'dispatch-1',
    electorId: 'elector-1',
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns the valid link with the dispatch identity in the query', async () => {
    execute.mockResolvedValue({
      electorId: 'elector-1',
      participationUrl: 'https://vote.example.test/participate#reference',
    });

    await expect(
      controller.getDispatchLink(TEST_USER_PRINCIPAL, params),
    ).resolves.toEqual({
      electorId: 'elector-1',
      participationUrl: 'https://vote.example.test/participate#reference',
    });
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      ...params,
      requestedByUserPrincipalId: TEST_USER_PRINCIPAL.id,
    });
  });

  it.each([
    [
      new DevelopmentParticipationDispatchLinkNotFoundError(),
      NotFoundException,
    ],
    [new DevelopmentParticipationDispatchLinkStaleError(), ConflictException],
    [new DevelopmentParticipationLinkAccessDeniedError(), ForbiddenException],
    [new ParticipationAccessNotConfiguredError(), ServiceUnavailableException],
  ])('maps %s to %s', async (error, expected) => {
    execute.mockRejectedValue(error);

    await expect(
      controller.getDispatchLink(TEST_USER_PRINCIPAL, params),
    ).rejects.toBeInstanceOf(expected);
  });
});
