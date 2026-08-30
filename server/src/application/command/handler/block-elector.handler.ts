import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../domain/shared/domain-error';
import {
  ELECTOR_REPOSITORY_PORT,
  type ElectorRepositoryPort,
} from '../../port/persistence/command/elector-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { BlockElectorCommand } from '../block-elector.command';
import { ManagedResourceNotFoundError } from '../vote-management.error';

@Injectable()
export class BlockElectorHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electors: ElectorRepositoryPort,
  ) {}

  async execute(command: BlockElectorCommand) {
    const [vote, elector] = await Promise.all([
      this.votes.findById(command.voteId),
      this.electors.findById(command.voteId, command.electorId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!elector) throw new ManagedResourceNotFoundError('elector');
    if (vote.status !== 'DRAFT')
      throw new DomainError('only draft vote resources can be deleted');
    if (vote.electoralRollSnapshotId !== undefined)
      throw new DomainError(
        'electors are managed by the attached electoral roll snapshot',
      );
    elector.block();
    await this.electors.save(elector);
    return { id: elector.id, voteId: elector.voteId, status: elector.status };
  }
}
