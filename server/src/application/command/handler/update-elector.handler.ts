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
import { UpdateElectorCommand } from '../update-elector.command';
import { ManagedResourceNotFoundError } from '../vote-management.error';

@Injectable()
export class UpdateElectorHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electors: ElectorRepositoryPort,
  ) {}

  async execute(command: UpdateElectorCommand) {
    const [vote, elector] = await Promise.all([
      this.votes.findById(command.voteId),
      this.electors.findById(command.voteId, command.electorId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!elector) throw new ManagedResourceNotFoundError('elector');
    if (vote.status !== 'DRAFT')
      throw new DomainError('only draft vote resources can be updated');
    elector.update({
      name: elector.name,
      identifier: command.identifier,
      phoneNumber: elector.phoneNumber,
      birthDate: elector.birthDate,
      groupKey: command.groupKey,
      voteWeight: command.voteWeight,
    });
    await this.electors.save(elector);
    return { id: elector.id, voteId: elector.voteId, status: elector.status };
  }
}
