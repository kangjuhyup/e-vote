import { Inject, Injectable } from '@nestjs/common';
import { RemoveElectoralRollMemberCommand } from '../remove-electoral-roll-member.command';
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
} from '../../port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../persistence/transaction/transactional.decorator';

export type RemoveElectoralRollMemberResult = {
  readonly electoralRollId: string;
  readonly memberId: string;
  readonly revision: number;
};

@Injectable()
export class RemoveElectoralRollMemberHandler {
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
    command: RemoveElectoralRollMemberCommand,
  ): Promise<RemoveElectoralRollMemberResult> {
    const electoralRoll = await this.electoralRollRepository.findById(
      command.electoralRollId,
    );
    if (!electoralRoll) throw new ElectoralRollNotFoundError();

    const member = await this.electoralRollRepository.findMemberById(
      command.electoralRollId,
      command.memberId,
    );
    if (!member) throw new ElectoralRollMemberNotFoundError();

    electoralRoll.markMembersChanged(command.changedAt);
    await this.electoralRollRepository.removeMember(
      command.electoralRollId,
      command.memberId,
    );
    await this.electoralRollRepository.save(electoralRoll);

    return {
      electoralRollId: electoralRoll.id,
      memberId: member.id,
      revision: electoralRoll.revision,
    };
  }
}
