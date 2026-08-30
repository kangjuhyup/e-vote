import { Inject, Injectable } from '@nestjs/common';
import { ElectoralRollAggregate } from '../../../domain/electoral-roll/electoral-roll.aggregate';
import { CreateElectoralRollCommand } from '../dto/request/create-electoral-roll.command';
import { CreateElectoralRollResult } from '../dto/response/create-electoral-roll-result.dto';
import {
  ElectionCommissionNotFoundError,
  ElectionCommissionUnavailableError,
} from './create-vote.handler';
import {
  ELECTION_COMMISSION_REPOSITORY_PORT,
  type ElectionCommissionRepositoryPort,
} from '../../port/persistence/command/election-commission-repository.port';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../../port/persistence/command/electoral-roll-repository.port';

@Injectable()
export class CreateElectoralRollHandler {
  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly electionCommissionRepository: ElectionCommissionRepositoryPort,
  ) {}

  async execute(
    command: CreateElectoralRollCommand,
  ): Promise<CreateElectoralRollResult> {
    const commission = await this.electionCommissionRepository.findById(
      command.commissionId,
    );
    if (!commission) throw new ElectionCommissionNotFoundError();
    if (!commission.canRunVote())
      throw new ElectionCommissionUnavailableError();

    const electoralRoll = ElectoralRollAggregate.create({
      id: this.electoralRollRepository.nextId(),
      commissionId: command.commissionId,
      name: command.name,
      createdAt: command.createdAt,
    });
    await this.electoralRollRepository.save(electoralRoll);

    return CreateElectoralRollResult.of({
      id: electoralRoll.id,
      commissionId: electoralRoll.commissionId,
      name: electoralRoll.name,
      revision: electoralRoll.revision,
    });
  }
}
