import { Inject, Injectable } from '@nestjs/common';
import { UpdateElectoralRollMemberCommand } from '../dto/request/update-electoral-roll-member.command';
import {
  ElectoralRollMemberNotFoundError,
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
import { ManageElectoralRollMemberResult } from '../dto/response/manage-electoral-roll-member-result.dto';
import { ElectoralRollSnapshotCreator } from '../electoral-roll-snapshot.creator';

@Injectable()
export class UpdateElectoralRollMemberHandler {
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
    command: UpdateElectoralRollMemberCommand,
  ): Promise<ManageElectoralRollMemberResult> {
    const electoralRoll = await this.electoralRollRepository.findById(
      command.electoralRollId,
      command.userPrincipalId,
    );
    if (!electoralRoll) throw new ElectoralRollNotFoundError();

    const member = await this.electoralRollRepository.findMemberById(
      command.electoralRollId,
      command.memberId,
    );
    if (!member) throw new ElectoralRollMemberNotFoundError();

    member.update(
      {
        identifier: command.identifier,
        groupKey: command.groupKey,
        voteWeight: command.voteWeight,
      },
      command.changedAt,
    );
    electoralRoll.markMembersChanged(command.changedAt);

    await this.electoralRollRepository.saveMember(member);
    await this.electoralRollRepository.save(electoralRoll);
    await this.snapshotCreator.createForCurrentRevision(
      electoralRoll,
      command.changedAt,
    );

    return ManageElectoralRollMemberResult.of({
      id: member.id,
      electoralRollId: member.electoralRollId,
      identifier: member.identifier,
      groupKey: member.groupKey,
      voteWeight: member.voteWeight,
      revision: electoralRoll.revision,
    });
  }
}
