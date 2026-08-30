import { Inject, Injectable } from '@nestjs/common';
import { IdentityVerificationPolicy } from '../../../domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../domain/vote/vo/vote-policy.vo';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { UpdateVoteCommand } from '../update-vote.command';
import { ManagedResourceNotFoundError } from '../vote-management.error';

@Injectable()
export class UpdateVoteHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly repository: VoteRepositoryPort,
  ) {}

  async execute(command: UpdateVoteCommand) {
    const vote = await this.repository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.updateSettings({
      title: command.title,
      votingChannels: command.votingChannels,
      defaultPolicy: VotePolicy.of(command.defaultPolicy),
      identityVerificationPolicy: IdentityVerificationPolicy.of(
        command.identityVerificationPolicy,
      ),
    });
    await this.repository.save(vote);
    return { id: vote.id, status: vote.status };
  }
}
