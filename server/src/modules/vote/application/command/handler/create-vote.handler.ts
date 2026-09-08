import { Inject, Injectable } from '@nestjs/common';
import { VoteAggregate } from '../../../domain/vote/vote.aggregate';
import { VoteStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import { IdentityVerificationPolicy } from '../../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../../shared/domain/voting/vo/vote-policy.vo';
import { CreateVoteCommand } from '../dto/request/create-vote.command';
import { CreateVoteResult } from '../dto/response/create-vote-result.dto';
import {
  ELECTION_COMMISSION_ACCESS_PORT,
  type ElectionCommissionAccessPort,
} from '../../../../../shared/application/port/capability/election-commission-access.port';
import {
  ElectionCommissionNotFoundError,
  ElectionCommissionUnavailableError,
} from '../../../../../shared/application/error/election-commission-access.error';
import { VOTE_REPOSITORY_PORT } from '../../port/persistence/command/vote-repository.port';
import type { VoteRepositoryPort } from '../../port/persistence/command/vote-repository.port';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import { UserPrincipal } from '../../../../../shared/application/security/user-principal';

@Injectable()
export class CreateVoteHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(ELECTION_COMMISSION_ACCESS_PORT)
    private readonly electionCommissionRepository: ElectionCommissionAccessPort,
  ) {}

  async execute(
    command: CreateVoteCommand,
    user: UserPrincipal,
  ): Promise<CreateVoteResult> {
    if (
      user.tenantId !== command.tenantId ||
      !user.managesOrganization({
        organizationGroupId: command.organizationGroupId,
        organizationGroupCode: command.organizationGroupCode,
      })
    ) {
      throw new ManagedResourceNotFoundError('vote');
    }
    const commission = await this.electionCommissionRepository.findById(
      command.commissionId,
    );

    if (!commission) {
      throw new ElectionCommissionNotFoundError();
    }

    if (!commission.canRunVote()) {
      throw new ElectionCommissionUnavailableError();
    }

    const vote = VoteAggregate.create({
      id: this.voteRepository.nextId(),
      tenantId: command.tenantId,
      organizationGroupId: command.organizationGroupId,
      organizationGroupCode: command.organizationGroupCode,
      createdByUserPrincipalId: command.createdByUserPrincipalId,
      commissionId: command.commissionId,
      title: command.title,
      votingChannels: command.votingChannels,
      defaultPolicy: VotePolicy.of(command.defaultPolicy),
      identityVerificationPolicy: IdentityVerificationPolicy.of(
        command.identityVerificationPolicy,
      ),
      startedAt: command.startedAt,
      endedAt: command.endedAt,
      status: VoteStatus.Draft,
    });

    await this.voteRepository.save(vote);

    return CreateVoteResult.of({
      id: vote.id,
      commissionId: vote.commissionId,
      status: vote.status,
    });
  }
}
