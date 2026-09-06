import { Inject, Injectable } from '@nestjs/common';
import { VotingChannel } from '../../../../../shared/domain/voting/type/voting-channel.type';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { CastParticipationWithAccessCommand } from '../dto/request/cast-participation-with-access.command';
import { CastParticipationResult } from '../dto/response/cast-participation-result.dto';
import { ResolveParticipationAccessSessionHandler } from '../../query/handler/resolve-participation-access-session.handler';
import { ParticipantSessionScope } from '../../../domain/access/elector-participant-session.aggregate';
import {
  AUTHORIZED_PARTICIPATION_CAST_PORT,
  type AuthorizedParticipationCastPort,
} from '../../../../../shared/application/port/capability/participant-operations.port';

@Injectable()
export class CastParticipationWithAccessHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    private readonly sessions: ResolveParticipationAccessSessionHandler,
    @Inject(AUTHORIZED_PARTICIPATION_CAST_PORT)
    private readonly casting: AuthorizedParticipationCastPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: CastParticipationWithAccessCommand,
    now = new Date(),
  ): Promise<CastParticipationResult> {
    const session = await this.sessions.execute({
      sessionToken: command.sessionToken,
      csrfToken: command.csrfToken,
      expectedScope: ParticipantSessionScope.Participate,
      requireCsrf: true,
      now,
    });
    const result = await this.casting.cast({
      voteId: session.voteId,
      electorId: session.electorId,
      voteDetailId: command.voteDetailId,
      selectedCandidateId: command.selectedCandidateId,
      votingChannel: VotingChannel.Online,
      fieldVotingSessionId: undefined,
      participatedAt: now,
    });
    return CastParticipationResult.of(result);
  }
}
