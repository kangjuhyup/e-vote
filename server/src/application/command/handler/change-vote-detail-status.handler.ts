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
import { ChangeVoteDetailStatusCommand } from '../dto/request/change-vote-detail-status.command';
import { ManageVoteDetailResult } from '../dto/response/manage-vote-detail-result.dto';
import {
  ManagedResourceNotFoundError,
  ManagedResourceScopeMismatchError,
} from '../vote-management.error';

@Injectable()
export class ChangeVoteDetailStatusHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly details: VoteDetailRepositoryPort,
  ) {}

  async execute(
    command: ChangeVoteDetailStatusCommand,
  ): Promise<ManageVoteDetailResult> {
    const [vote, detail] = await Promise.all([
      this.votes.findById(command.voteId),
      this.details.findById(command.voteDetailId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!detail) throw new ManagedResourceNotFoundError('vote detail');
    if (detail.voteId !== vote.id)
      throw new ManagedResourceScopeMismatchError();
    if (command.action === 'open') {
      if (vote.status !== 'OPEN')
        throw new DomainError('parent vote must be open');
      detail.open(command.changedAt);
    } else if (command.action === 'close') {
      detail.close(command.changedAt);
    } else {
      if (vote.status !== 'DRAFT')
        throw new DomainError('only draft vote resources can be canceled');
      detail.cancel();
    }
    await this.details.save(detail);
    return ManageVoteDetailResult.of({
      id: detail.id,
      voteId: detail.voteId,
      status: detail.status,
    });
  }
}
