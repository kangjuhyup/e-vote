import { Inject, Injectable } from '@nestjs/common';
import { IdentityVerificationPolicy } from '../../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../../shared/domain/voting/vo/vote-policy.vo';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { UpdateVoteCommand } from '../dto/request/update-vote.command';
import { ManageVoteResult } from '../dto/response/manage-vote-result.dto';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';

@Injectable()
export class UpdateVoteHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly repository: VoteRepositoryPort,
  ) {}

  async execute(command: UpdateVoteCommand): Promise<ManageVoteResult> {
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
    return ManageVoteResult.of({ id: vote.id, status: vote.status });
  }
}
