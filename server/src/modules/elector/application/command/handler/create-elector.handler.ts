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
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';

@Injectable()
export class CreateElectorHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electorRepository: ElectorRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: CreateElectorCommand): Promise<CreateElectorResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.assertElectorsMutable('created');

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
