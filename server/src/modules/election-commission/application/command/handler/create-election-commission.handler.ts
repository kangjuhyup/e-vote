import { Inject, Injectable } from '@nestjs/common';
import { ElectionCommissionAggregate } from '../../../domain/election-commission.aggregate';
import { CreateElectionCommissionCommand } from '../dto/request/create-election-commission.command';
import { CreateElectionCommissionResult } from '../dto/response/create-election-commission-result.dto';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-repository.port';
import type { ElectionCommissionRepositoryPort } from '../../port/persistence/command/election-commission-repository.port';

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

    return CreateElectionCommissionResult.of({
      id: commission.id,
      status: commission.status,
    });
  }
}
