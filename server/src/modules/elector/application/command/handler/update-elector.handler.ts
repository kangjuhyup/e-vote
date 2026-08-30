import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../../../shared/domain/domain-error';
import {
  ELECTOR_REPOSITORY_PORT,
  type ElectorRepositoryPort,
} from '../../port/persistence/command/elector-repository.port';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { UpdateElectorCommand } from '../dto/request/update-elector.command';
import { ManageElectorResult } from '../dto/response/manage-elector-result.dto';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';

@Injectable()
export class UpdateElectorHandler {
  constructor(
    @Inject(VOTE_ACCESS_PORT) private readonly votes: VoteAccessPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electors: ElectorRepositoryPort,
  ) {}

  async execute(command: UpdateElectorCommand): Promise<ManageElectorResult> {
    const [vote, elector] = await Promise.all([
      this.votes.findById(command.voteId),
      this.electors.findById(command.voteId, command.electorId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!elector) throw new ManagedResourceNotFoundError('elector');
    if (vote.status !== 'DRAFT')
      throw new DomainError('only draft vote resources can be updated');
    if (vote.electoralRollSnapshotId !== undefined)
      throw new DomainError(
        'electors are managed by the attached electoral roll snapshot',
      );
    elector.update({
      name: elector.name,
      identifier: command.identifier,
      phoneNumber: elector.phoneNumber,
      birthDate: elector.birthDate,
      groupKey: command.groupKey,
      voteWeight: command.voteWeight,
    });
    await this.electors.save(elector);
    return ManageElectorResult.of({
      id: elector.id,
      voteId: elector.voteId,
      status: elector.status,
    });
  }
}
