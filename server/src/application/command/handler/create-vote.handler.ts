import { Inject, Injectable } from '@nestjs/common';
import { VoteAggregate } from '../../../domain/vote/vote.aggregate';
import { VoteStatus } from '../../../domain/vote/type/vote-status.type';
import { IdentityVerificationPolicy } from '../../../domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../domain/vote/vo/vote-policy.vo';
import { CreateVoteCommand } from '../create-vote.command';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-repository.port';
import type { ElectionCommissionRepositoryPort } from '../../port/persistence/command/election-commission-repository.port';
import { VOTE_REPOSITORY_PORT } from '../../port/persistence/command/vote-repository.port';
import type { VoteRepositoryPort } from '../../port/persistence/command/vote-repository.port';

export type CreateVoteResult = {
  id: string;
  commissionId: string;
  status: VoteStatus;
};

export class ElectionCommissionNotFoundError extends Error {
  constructor() {
    super('election commission not found');
  }
}

export class ElectionCommissionUnavailableError extends Error {
  constructor() {
    super('election commission is not active');
  }
}

@Injectable()
export class CreateVoteHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly electionCommissionRepository: ElectionCommissionRepositoryPort,
  ) {}

  async execute(command: CreateVoteCommand): Promise<CreateVoteResult> {
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
      commissionId: command.commissionId,
      title: command.title,
      votingChannels: command.votingChannels,
      defaultPolicy: VotePolicy.of(command.defaultPolicy),
      identityVerificationPolicy: IdentityVerificationPolicy.of(
        command.identityVerificationPolicy,
      ),
      status: VoteStatus.Draft,
    });

    await this.voteRepository.save(vote);

    return {
      id: vote.id,
      commissionId: vote.commissionId,
      status: vote.status,
    };
  }
}
