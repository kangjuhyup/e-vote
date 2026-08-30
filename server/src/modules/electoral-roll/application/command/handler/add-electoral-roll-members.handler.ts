import { Inject, Injectable } from '@nestjs/common';
import { ElectoralRollMemberAggregate } from '../../../domain/electoral-roll-member.aggregate';
import { AddElectoralRollMembersCommand } from '../dto/request/add-electoral-roll-members.command';
import { AddElectoralRollMembersResult } from '../dto/response/add-electoral-roll-members-result.dto';
import {
  DuplicateElectoralRollMemberIdentifierError,
  ElectoralRollNotFoundError,
} from '../electoral-roll.error';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../../port/persistence/command/electoral-roll-repository.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { ElectoralRollSnapshotCreator } from '../electoral-roll-snapshot.creator';

@Injectable()
export class AddElectoralRollMembersHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    private readonly snapshotCreator: ElectoralRollSnapshotCreator,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: AddElectoralRollMembersCommand,
  ): Promise<AddElectoralRollMembersResult> {
    const electoralRoll = await this.electoralRollRepository.findById(
      command.electoralRollId,
    );
    if (!electoralRoll) throw new ElectoralRollNotFoundError();

    const members = command.members.map((input) =>
      ElectoralRollMemberAggregate.create({
        id: this.electoralRollRepository.nextMemberId(),
        electoralRollId: electoralRoll.id,
        identifier: input.identifier,
        groupKey: input.groupKey,
        voteWeight: input.voteWeight,
        createdAt: command.changedAt,
      }),
    );
    assertUniqueIdentifiers(members);

    electoralRoll.markMembersChanged(command.changedAt);
    await this.electoralRollRepository.saveMembers(members);
    await this.electoralRollRepository.save(electoralRoll);
    await this.snapshotCreator.createForCurrentRevision(
      electoralRoll,
      command.changedAt,
    );

    return AddElectoralRollMembersResult.of({
      electoralRollId: electoralRoll.id,
      revision: electoralRoll.revision,
      addedMemberCount: members.length,
    });
  }
}

function assertUniqueIdentifiers(
  members: readonly ElectoralRollMemberAggregate[],
): void {
  const identifiers = new Set<string>();

  for (const member of members) {
    if (identifiers.has(member.identifier)) {
      throw new DuplicateElectoralRollMemberIdentifierError(member.identifier);
    }
    identifiers.add(member.identifier);
  }
}
