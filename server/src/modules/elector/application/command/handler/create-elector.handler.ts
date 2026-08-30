import { Inject, Injectable } from '@nestjs/common';
import { ElectorAggregate } from '../../../domain/elector.aggregate';
import { ElectorStatus } from '../../../../../shared/domain/voting/type/elector-status.type';
import { CreateElectorCommand } from '../dto/request/create-elector.command';
import { CreateElectorResult } from '../dto/response/create-elector-result.dto';
import { ELECTOR_REPOSITORY_PORT } from '../../port/persistence/command/elector-repository.port';
import type { ElectorRepositoryPort } from '../../port/persistence/command/elector-repository.port';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { DomainError } from '../../../../../shared/domain/domain-error';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';

@Injectable()
export class CreateElectorHandler {
  constructor(
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electorRepository: ElectorRepositoryPort,
  ) {}

  async execute(command: CreateElectorCommand): Promise<CreateElectorResult> {
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (vote.status !== 'DRAFT') {
      throw new DomainError('only draft vote resources can be created');
    }
    if (vote.electoralRollSnapshotId !== undefined) {
      throw new DomainError(
        'electors are managed by the attached electoral roll snapshot',
      );
    }

    const elector = ElectorAggregate.create({
      id: this.electorRepository.nextId(),
      voteId: command.voteId,
      name: command.name,
      identifier: command.identifier,
      phoneNumber: command.phoneNumber,
      birthDate: command.birthDate,
      groupKey: command.groupKey,
      voteWeight: command.voteWeight,
      status: ElectorStatus.Eligible,
    });

    await this.electorRepository.save(elector);

    return CreateElectorResult.of({
      id: elector.id,
      voteId: elector.voteId,
      name: elector.name,
      phoneNumber: elector.phoneNumber,
      birthDate: elector.birthDate,
      status: elector.status,
    });
  }
}
