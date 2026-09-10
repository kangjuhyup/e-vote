import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../application/port/persistence/command/vote-repository.port';
import type { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { VOTE_ORGANIZATION_PROTECTED } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';
import type { VoteOrganizationAccess } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';

type VoteOrganizationRequest = {
  readonly params?: { readonly voteId?: string };
  readonly user?: UserPrincipal;
};

@Injectable()
export class VoteOrganizationAccessGuard implements CanActivate {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly votes: VoteRepositoryPort,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAccess =
      this.reflector.getAllAndOverride<VoteOrganizationAccess>(
        VOTE_ORGANIZATION_PROTECTED,
        [context.getHandler(), context.getClass()],
      );
    if (!requiredAccess) return true;
    const request = context
      .switchToHttp()
      .getRequest<VoteOrganizationRequest>();
    const voteId = request.params?.voteId;
    if (!voteId) return true;
    const user = request.user;
    if (!user) throw new ForbiddenException();
    const vote = await this.votes.findById(voteId);
    if (!vote) throw new ForbiddenException();

    if (
      !vote.tenantId ||
      !vote.organizationGroupId ||
      !vote.organizationGroupCode
    ) {
      if (vote.isCreatedBy(user.id)) return true;
      throw new ForbiddenException();
    }
    if (user.tenantId !== vote.tenantId) throw new ForbiddenException();
    if (user.hasTenantRole('vote-admin')) return true;
    if (
      requiredAccess === 'read' &&
      user.belongsToOrganization({
        organizationGroupId: vote.organizationGroupId,
        organizationGroupCode: vote.organizationGroupCode,
      })
    ) {
      return true;
    }
    if (
      user.managesOrganization({
        organizationGroupId: vote.organizationGroupId,
        organizationGroupCode: vote.organizationGroupCode,
      })
    ) {
      return true;
    }
    throw new ForbiddenException();
  }
}
