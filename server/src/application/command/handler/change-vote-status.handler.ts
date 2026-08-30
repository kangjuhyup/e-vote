import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { ChangeVoteStatusCommand } from '../change-vote-status.command';
import { ManagedResourceNotFoundError } from '../vote-management.error';

@Injectable()
export class ChangeVoteStatusHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly repository: VoteRepositoryPort,
  ) {}

  async execute(command: ChangeVoteStatusCommand) {
    const vote = await this.repository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (command.action === 'open') vote.open(command.changedAt);
    else if (command.action === 'close') vote.close(command.changedAt);
    else vote.cancel(command.changedAt);
    await this.repository.save(vote);
    return { id: vote.id, status: vote.status };
  }
}
