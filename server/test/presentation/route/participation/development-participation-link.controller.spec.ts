import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GetDevelopmentParticipationLinkHandler } from '../../../../src/modules/participation/application/query/handler/get-development-participation-link.handler';
import {
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
  DevelopmentParticipationLinkNotFoundError,
} from '../../../../src/modules/participation/application/query/development-participation-link.error';
import { ParticipationAccessNotConfiguredError } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import { DevelopmentParticipationLinkController } from '../../../../src/modules/participation/presentation/development-participation-link/development-participation-link.controller';
import { isDevelopmentParticipationLinkEnabled } from '../../../../src/modules/participation/presentation/development-participation-link/development-participation-link.config';
import { UserPrincipal } from '../../../../src/shared/application/security/user-principal';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies injected controller collaborator mocks without invoking a detached method. */

describe('DevelopmentParticipationLinkController', () => {
  it('maps the authenticated vote creator and returns only the requested link', async () => {
    const handler = {
      execute: jest.fn().mockResolvedValue({
        electorId: 'elector-1',
        participationUrl:
          'http://localhost:3001/participate#access_token=signed-reference',
      }),
    } as unknown as jest.Mocked<GetDevelopmentParticipationLinkHandler>;
    const controller = new DevelopmentParticipationLinkController(handler);

    await expect(
      controller.getCurrentLink(UserPrincipal.of({ id: 'creator-1' }), {
        voteId: 'vote-1',
        electorId: 'elector-1',
      }),
    ).resolves.toEqual({
      electorId: 'elector-1',
      participationUrl:
        'http://localhost:3001/participate#access_token=signed-reference',
    });
    expect(handler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        voteId: 'vote-1',
        electorId: 'elector-1',
        requestedByUserPrincipalId: 'creator-1',
      }),
    );
  });

  it.each([
    [new DevelopmentParticipationLinkNotFoundError(), NotFoundException],
    [new DevelopmentParticipationLinkAccessDeniedError(), ForbiddenException],
    [new DevelopmentParticipationLinkMismatchError(), ConflictException],
    [new ParticipationAccessNotConfiguredError(), ServiceUnavailableException],
  ])('maps domain failure %p to %p', async (failure, expected) => {
    const handler = {
      execute: jest.fn().mockRejectedValue(failure),
    } as unknown as jest.Mocked<GetDevelopmentParticipationLinkHandler>;
    const controller = new DevelopmentParticipationLinkController(handler);

    await expect(
      controller.getCurrentLink(UserPrincipal.of({ id: 'creator-1' }), {
        voteId: 'vote-1',
        electorId: 'elector-1',
      }),
    ).rejects.toBeInstanceOf(expected);
  });
});

describe('development participation link environment guard', () => {
  it.each(['development', 'test'])(
    'enables the route in %s',
    (nodeEnvironment) => {
      expect(isDevelopmentParticipationLinkEnabled(nodeEnvironment)).toBe(true);
    },
  );

  it.each(['production', 'staging', undefined])(
    'keeps the route unregistered in %s',
    (nodeEnvironment) => {
      expect(isDevelopmentParticipationLinkEnabled(nodeEnvironment)).toBe(
        false,
      );
    },
  );

  it.each(['start:dev', 'start:debug'])(
    'enables the route for the %s package script when NODE_ENV is absent',
    (npmLifecycleEvent) => {
      expect(
        isDevelopmentParticipationLinkEnabled(undefined, npmLifecycleEvent),
      ).toBe(true);
    },
  );

  it('does not let the package script override an explicit production environment', () => {
    expect(
      isDevelopmentParticipationLinkEnabled('production', 'start:dev'),
    ).toBe(false);
  });
});
