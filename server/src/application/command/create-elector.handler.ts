import { Inject, Injectable } from '@nestjs/common';
import { ElectorAggregate } from '../../domain/elector/elector.aggregate';
import { ElectorStatus } from '../../domain/elector/type/elector-status.type';
import { CreateElectorCommand } from './create-elector.command';
import { ELECTOR_REPOSITORY_PORT } from '../port/elector-repository.port';
import type { ElectorRepositoryPort } from '../port/elector-repository.port';

export type CreateElectorResult = {
  id: string;
  voteId: string;
  status: ElectorStatus;
};

@Injectable()
export class CreateElectorHandler {
  constructor(
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electorRepository: ElectorRepositoryPort,
  ) {}

  async execute(command: CreateElectorCommand): Promise<CreateElectorResult> {
    const elector = ElectorAggregate.create({
      id: this.electorRepository.nextId(),
      voteId: command.voteId,
      identifier: command.identifier,
      groupKey: command.groupKey,
      voteWeight: command.voteWeight,
      status: ElectorStatus.Eligible,
    });

    await this.electorRepository.save(elector);

    return {
      id: elector.id,
      voteId: elector.voteId,
      status: elector.status,
    };
  }
}
