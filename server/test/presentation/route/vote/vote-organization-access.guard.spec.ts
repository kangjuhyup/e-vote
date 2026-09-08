import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { VoteOrganizationAccessGuard } from '../../../../src/modules/vote/presentation/vote/vote-organization-access.guard';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { UserPrincipal } from '../../../../src/shared/application/security/user-principal';

const managedUser = UserPrincipal.of({
  id: 'manager-1',
  tenantId: 'tenant-1',
  groups: [
    { id: 'organization-1', code: 'ORG-001', roles: [] },
    {
      id: 'managers-1',
      code: 'ORG-001.vote-managers',
      parentId: 'organization-1',
      roles: [{ id: 'role-1', code: 'vote-manager' }],
    },
  ],
});

function context(user: UserPrincipal): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ params: { voteId: 'vote-1' }, user }),
    }),
  } as unknown as ExecutionContext;
}

describe('vote organization management access', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(true),
  } as unknown as Reflector;

  it('allows a manager whose direct groups prove the organization hierarchy', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        organizationGroupId: 'organization-1',
        organizationGroupCode: 'ORG-001',
      }),
    } as unknown as VoteRepositoryPort;
    const guard = new VoteOrganizationAccessGuard(repository, reflector);

    await expect(guard.canActivate(context(managedUser))).resolves.toBe(true);
  });

  it('hides a vote owned by another tenant', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        tenantId: 'tenant-2',
        organizationGroupId: 'organization-1',
        organizationGroupCode: 'ORG-001',
      } as VoteAggregate),
    } as unknown as VoteRepositoryPort;
    const guard = new VoteOrganizationAccessGuard(repository, reflector);

    await expect(guard.canActivate(context(managedUser))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
