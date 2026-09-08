import { Inject, Injectable } from '@nestjs/common';
import { VoteStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import { ElectorStatus } from '../../../../../shared/domain/voting/type/elector-status.type';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  ELECTOR_ACCESS_PORT,
  type ElectorAccessPort,
} from '../../../../../shared/application/port/capability/elector-access.port';
import {
  ElectorParticipantSessionAggregate,
  ParticipantSessionScope,
} from '../../../domain/access/elector-participant-session.aggregate';
import { ParticipationInvitationAlreadyClaimedError } from '../../../domain/access/participation-access.error';
import { ExchangeParticipationAccessCommand } from '../dto/request/exchange-participation-access.command';
import {
  ExchangeParticipationAccessResult,
  ParticipationAuthenticationRequiredResult,
} from '../dto/response/exchange-participation-access-result.dto';
import {
  ParticipationAccessConflictError,
  ParticipationAccessInvalidError,
  ParticipationAccessUnavailableError,
} from '../participation-access.error';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ParticipationAccessRepositoryPort,
} from '../../port/persistence/command/participation-access-repository.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';

const RESULT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;

@Injectable()
export class ExchangeParticipationAccessHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_ACCESS_PORT) private readonly votes: VoteAccessPort,
    @Inject(ELECTOR_ACCESS_PORT)
    private readonly electors: ElectorAccessPort,
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly access: ParticipationAccessRepositoryPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: ExchangeParticipationAccessCommand,
    now = new Date(),
  ): Promise<
    | ExchangeParticipationAccessResult
    | ParticipationAuthenticationRequiredResult
  > {
    const claims = this.tokens.verifyReference(command.token);
    const invitation = await this.access.findInvitationByIdForUpdate(
      claims.invitationId,
    );
    if (!invitation) throw new ParticipationAccessInvalidError();
    try {
      invitation.assertCurrentToken(claims.generation, claims.tokenDigest);
    } catch {
      throw new ParticipationAccessInvalidError();
    }

    const [vote, elector] = await Promise.all([
      this.votes.findById(invitation.voteId),
      this.electors.findById(invitation.voteId, invitation.electorId),
    ]);
    if (!vote || !elector || elector.status !== ElectorStatus.Eligible) {
      throw new ParticipationAccessUnavailableError();
    }

    if (
      vote.status !== VoteStatus.Finalized &&
      vote.status !== VoteStatus.Open &&
      vote.status !== VoteStatus.Closed
    ) {
      throw new ParticipationAccessUnavailableError();
    }
    if (vote.identityVerificationPolicy.required) {
      // The link identifies the authentication target; it grants no voting authority.
      return ParticipationAuthenticationRequiredResult.of({
        voteId: vote.id,
        electorId: elector.id,
      });
    }

    if (vote.status === VoteStatus.Closed) {
      return (
        await this.issueSession({
          invitationId: invitation.id,
          voteId: vote.id,
          electorId: elector.id,
          invitationGeneration: invitation.generation,
          scope: ParticipantSessionScope.ResultRead,
          expiresAt: new Date(now.getTime() + RESULT_SESSION_DURATION_MS),
          now,
        })
      ).result;
    }
    if (invitation.claimedSessionId) {
      const currentSession = command.currentSessionToken
        ? await this.access.findSessionByTokenDigest(
            this.tokens.digest(command.currentSessionToken),
          )
        : undefined;
      if (
        !currentSession ||
        currentSession.id !== invitation.claimedSessionId
      ) {
        throw new ParticipationAccessConflictError();
      }
      try {
        currentSession.assertUsable({
          expectedScope: ParticipantSessionScope.Participate,
          invitationGeneration: invitation.generation,
          now,
        });
      } catch {
        throw new ParticipationAccessConflictError();
      }
      const credentials = this.tokens.issueSessionCredentials();
      currentSession.rotateCredentials({
        tokenDigest: credentials.sessionTokenDigest,
        csrfTokenDigest: credentials.csrfTokenDigest,
        now,
      });
      await this.access.saveSession(currentSession);
      return ExchangeParticipationAccessResult.of({
        sessionToken: credentials.sessionToken,
        csrfToken: credentials.csrfToken,
        scope: currentSession.scope,
        voteId: currentSession.voteId,
        sessionExpiresAt: currentSession.expiresAt,
      });
    }

    const issuedSession = await this.issueSession({
      invitationId: invitation.id,
      voteId: vote.id,
      electorId: elector.id,
      invitationGeneration: invitation.generation,
      scope: ParticipantSessionScope.Participate,
      expiresAt: vote.endedAt,
      now,
    });
    try {
      invitation.claimForParticipation(issuedSession.sessionId, now);
    } catch (error) {
      if (error instanceof ParticipationInvitationAlreadyClaimedError) {
        throw new ParticipationAccessConflictError();
      }
      throw error;
    }
    await this.access.saveInvitation(invitation);
    return issuedSession.result;
  }

  private async issueSession(params: {
    readonly invitationId: string;
    readonly voteId: string;
    readonly electorId: string;
    readonly invitationGeneration: number;
    readonly scope: ParticipantSessionScope;
    readonly expiresAt: Date;
    readonly now: Date;
  }): Promise<{
    readonly sessionId: string;
    readonly result: ExchangeParticipationAccessResult;
  }> {
    const credentials = this.tokens.issueSessionCredentials();
    const sessionId = this.access.nextId();
    const common = {
      id: sessionId,
      tokenDigest: credentials.sessionTokenDigest,
      csrfTokenDigest: credentials.csrfTokenDigest,
      invitationId: params.invitationId,
      voteId: params.voteId,
      electorId: params.electorId,
      invitationGeneration: params.invitationGeneration,
      expiresAt: params.expiresAt,
      now: params.now,
    };
    const session =
      params.scope === ParticipantSessionScope.Participate
        ? ElectorParticipantSessionAggregate.issueParticipation(common)
        : ElectorParticipantSessionAggregate.issueResultRead(common);
    await this.access.saveSession(session);
    return {
      sessionId,
      result: ExchangeParticipationAccessResult.of({
        sessionToken: credentials.sessionToken,
        csrfToken: credentials.csrfToken,
        scope: session.scope,
        voteId: session.voteId,
        sessionExpiresAt: session.expiresAt,
      }),
    };
  }
}
