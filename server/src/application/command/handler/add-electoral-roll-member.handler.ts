import { Inject, Injectable } from '@nestjs/common';
import { ElectoralRollMemberAggregate } from '../../../domain/electoral-roll/electoral-roll-member.aggregate';
import { AddElectoralRollMemberCommand } from '../dto/request/add-electoral-roll-member.command';
import { ManageElectoralRollMemberResult } from '../dto/response/manage-electoral-roll-member-result.dto';
import { ElectoralRollNotFoundError } from '../electoral-roll.error';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../../port/persistence/command/electoral-roll-repository.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../persistence/transaction/transactional.decorator';

@Injectable()
export class AddElectoralRollMemberHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: AddElectoralRollMemberCommand,
  ): Promise<ManageElectoralRollMemberResult> {
    const electoralRoll = await this.electoralRollRepository.findById(
      command.electoralRollId,
    );
    if (!electoralRoll) throw new ElectoralRollNotFoundError();

    const member = ElectoralRollMemberAggregate.create({
      id: this.electoralRollRepository.nextMemberId(),
      electoralRollId: electoralRoll.id,
      identifier: command.identifier,
      groupKey: command.groupKey,
      voteWeight: command.voteWeight,
      createdAt: command.changedAt,
    });
    electoralRoll.markMembersChanged(command.changedAt);

    await this.electoralRollRepository.saveMember(member);
    await this.electoralRollRepository.save(electoralRoll);

    return toMemberResult(member, electoralRoll.revision);
  }
}

export function toMemberResult(
  member: ElectoralRollMemberAggregate,
  revision: number,
): ManageElectoralRollMemberResult {
  return ManageElectoralRollMemberResult.of({
    id: member.id,
    electoralRollId: member.electoralRollId,
    identifier: member.identifier,
    groupKey: member.groupKey,
    voteWeight: member.voteWeight,
    revision,
  });
}
