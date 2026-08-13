import { Inject, Injectable } from '@nestjs/common';
import { ElectionCommissionAggregate } from '../../domain/election-commission/election-commission.aggregate';
import { ElectionCommissionStatus } from '../../domain/election-commission/type/election-commission-status.type';
import { CreateElectionCommissionCommand } from './create-election-commission.command';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../port/election-commission-repository.port';
import type { ElectionCommissionRepositoryPort } from '../port/election-commission-repository.port';

export type CreateElectionCommissionResult = {
  id: string;
  status: ElectionCommissionStatus;
};

@Injectable()
export class CreateElectionCommissionHandler {
  constructor(
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly electionCommissionRepository: ElectionCommissionRepositoryPort,
  ) {}

  async execute(
    command: CreateElectionCommissionCommand,
  ): Promise<CreateElectionCommissionResult> {
    const commission = ElectionCommissionAggregate.create({
      id: this.electionCommissionRepository.nextId(),
      name: command.name,
      createdAt: command.createdAt,
    });

    await this.electionCommissionRepository.save(commission);

    return {
      id: commission.id,
      status: commission.status,
    };
  }
}
