import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_DETAIL_REPOSITORY_PORT,
  type VoteDetailRepositoryPort,
} from '../../port/persistence/command/vote-detail-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { UpdateVoteDetailCommand } from '../dto/request/update-vote-detail.command';
import { ManageVoteDetailResult } from '../dto/response/manage-vote-detail-result.dto';
import {
  ManagedResourceNotFoundError,
  ManagedResourceScopeMismatchError,
} from '../../../../../shared/application/error/managed-resource.error';

@Injectable()
export class UpdateVoteDetailHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly details: VoteDetailRepositoryPort,
  ) {}

  async execute(
    command: UpdateVoteDetailCommand,
  ): Promise<ManageVoteDetailResult> {
    const [vote, detail] = await Promise.all([
      this.votes.findById(command.voteId),
      this.details.findById(command.voteDetailId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!detail) throw new ManagedResourceNotFoundError('vote detail');
    if (!detail.belongsToVote(vote.id))
      throw new ManagedResourceScopeMismatchError();
    vote.assertChildResourcesMutable('updated');
    detail.updateSettings(command);
    await this.details.save(detail);
    return ManageVoteDetailResult.of({
      id: detail.id,
      voteId: detail.voteId,
      status: detail.status,
    });
  }
}
