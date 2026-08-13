import { Inject, Injectable } from '@nestjs/common';
import { ElectorAggregate } from '../../domain/elector/elector.aggregate';
import { ElectorStatus } from '../../domain/elector/type/elector-status.type';
import { CreateElectorCommand } from './create-elector.command';
import { ELECTOR_REPOSITORY_PORT } from '../port/elector-repository.port';
import type { ElectorRepositoryPort } from '../port/elector-repository.port';

export type CreateElectorResult = {
  id: string;
  voteId: string;
  name: string;
  phoneNumber?: string;
  birthDate?: string;
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
      name: command.name,
      identifier: command.identifier,
      phoneNumber: command.phoneNumber,
      birthDate: command.birthDate,
      groupKey: command.groupKey,
      voteWeight: command.voteWeight,
      status: ElectorStatus.Eligible,
    });

    await this.electorRepository.save(elector);

    return {
      id: elector.id,
      voteId: elector.voteId,
      name: elector.name,
      phoneNumber: elector.phoneNumber,
      birthDate: elector.birthDate,
      status: elector.status,
    };
  }
}
