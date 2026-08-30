import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../domain/shared/domain-error';
import {
  VOTE_DETAIL_REPOSITORY_PORT,
  type VoteDetailRepositoryPort,
} from '../../port/persistence/command/vote-detail-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { UpdateVoteDetailCommand } from '../update-vote-detail.command';
import {
  ManagedResourceNotFoundError,
  ManagedResourceScopeMismatchError,
} from '../vote-management.error';

@Injectable()
export class UpdateVoteDetailHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly details: VoteDetailRepositoryPort,
  ) {}

  async execute(command: UpdateVoteDetailCommand) {
    const [vote, detail] = await Promise.all([
      this.votes.findById(command.voteId),
      this.details.findById(command.voteDetailId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!detail) throw new ManagedResourceNotFoundError('vote detail');
    if (detail.voteId !== vote.id)
      throw new ManagedResourceScopeMismatchError();
    if (vote.status !== 'DRAFT')
      throw new DomainError('only draft vote resources can be updated');
    detail.updateSettings(command);
    await this.details.save(detail);
    return { id: detail.id, voteId: detail.voteId, status: detail.status };
  }
}
