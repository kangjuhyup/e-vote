import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ELECTOR_REPOSITORY_PORT,
  type ElectorRepositoryPort,
} from '../../port/persistence/command/elector-repository.port';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { BlockElectorCommand } from '../dto/request/block-elector.command';
import { ManageElectorResult } from '../dto/response/manage-elector-result.dto';
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
import {
  PARTICIPATION_ACCESS_REVOCATION_PORT,
  type ParticipationAccessRevocationPort,
} from '../../../../../shared/application/port/capability/participation-access-revocation.port';

@Injectable()
export class BlockElectorHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_ACCESS_PORT) private readonly votes: VoteAccessPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electors: ElectorRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
    @Optional()
    @Inject(PARTICIPATION_ACCESS_REVOCATION_PORT)
    private readonly participationAccess?: ParticipationAccessRevocationPort,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: BlockElectorCommand): Promise<ManageElectorResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const [vote, elector] = await Promise.all([
      this.votes.findById(command.voteId),
      this.electors.findById(command.voteId, command.electorId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!elector) throw new ManagedResourceNotFoundError('elector');
    vote.assertElectorsMutable('deleted');
    elector.block();
    await this.electors.save(elector);
    await this.participationAccess?.revokeAccessForElector(
      elector.id,
      new Date(),
    );
    return ManageElectorResult.of({
      id: elector.id,
      voteId: elector.voteId,
      status: elector.status,
    });
  }
}
