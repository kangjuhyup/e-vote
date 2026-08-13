import { Inject, Injectable } from '@nestjs/common';
import { VoteAggregate } from '../../domain/vote/vote.aggregate';
import { VoteStatus } from '../../domain/vote/type/vote-status.type';
import { IdentityVerificationPolicy } from '../../domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../domain/vote/vo/vote-policy.vo';
import { CreateVoteCommand } from './create-vote.command';
import { VOTE_REPOSITORY_PORT } from '../port/vote-repository.port';
import type { VoteRepositoryPort } from '../port/vote-repository.port';

export type CreateVoteResult = {
  id: string;
  status: VoteStatus;
};

@Injectable()
export class CreateVoteHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
  ) {}

  async execute(command: CreateVoteCommand): Promise<CreateVoteResult> {
    const vote = VoteAggregate.create({
      id: this.voteRepository.nextId(),
      title: command.title,
      defaultPolicy: VotePolicy.of(command.defaultPolicy),
      identityVerificationPolicy: IdentityVerificationPolicy.of(
        command.identityVerificationPolicy,
      ),
      status: VoteStatus.Draft,
    });

    await this.voteRepository.save(vote);

    return {
      id: vote.id,
      status: vote.status,
    };
  }
}
