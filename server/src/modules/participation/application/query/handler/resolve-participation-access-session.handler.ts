import { Inject, Injectable } from '@nestjs/common';
import { ElectorStatus } from '../../../../../shared/domain/voting/type/elector-status.type';
import { VoteStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  ELECTOR_ACCESS_PORT,
  type ElectorAccessPort,
} from '../../../../../shared/application/port/capability/elector-access.port';
import {
  ParticipantSessionScope,
  type ParticipantSessionScope as ParticipantSessionScopeType,
} from '../../../domain/access/elector-participant-session.aggregate';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ParticipationAccessRepositoryPort,
} from '../../port/persistence/command/participation-access-repository.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';
import { ParticipationAccessSessionView } from '../dto/response/participation-access-session.view';
import {
  ParticipationAccessCsrfDeniedError,
  ParticipationAccessSessionInvalidError,
} from '../participation-access-session.error';

@Injectable()
export class ResolveParticipationAccessSessionHandler {
  constructor(
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly access: ParticipationAccessRepositoryPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
    @Inject(VOTE_ACCESS_PORT) private readonly votes: VoteAccessPort,
    @Inject(ELECTOR_ACCESS_PORT)
    private readonly electors: ElectorAccessPort,
  ) {}

  async execute(params: {
    readonly sessionToken: string;
    readonly csrfToken?: string;
    readonly expectedScope?: ParticipantSessionScopeType;
    readonly requireCsrf: boolean;
    readonly now?: Date;
  }): Promise<ParticipationAccessSessionView> {
    const now = params.now ?? new Date();
    const session = await this.access.findSessionByTokenDigest(
      this.tokens.digest(params.sessionToken),
    );
    if (!session) throw new ParticipationAccessSessionInvalidError();
    if (
      params.requireCsrf &&
      (!params.csrfToken ||
        this.tokens.digest(params.csrfToken) !== session.csrfTokenDigest)
    ) {
      throw new ParticipationAccessCsrfDeniedError();
    }

    const invitation = await this.access.findInvitationById(
      session.invitationId,
    );
    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.generation !== session.invitationGeneration ||
      invitation.voteId !== session.voteId ||
      invitation.electorId !== session.electorId
    ) {
      throw new ParticipationAccessSessionInvalidError();
    }
    const expectedScope = params.expectedScope ?? session.scope;
    try {
      session.assertUsable({
        expectedScope,
        invitationGeneration: invitation.generation,
        now,
      });
    } catch {
      throw new ParticipationAccessSessionInvalidError();
    }

    const [vote, elector] = await Promise.all([
      this.votes.findById(session.voteId),
      this.electors.findById(session.voteId, session.electorId),
    ]);
    if (
      !vote ||
      !elector ||
      elector.status !== ElectorStatus.Eligible ||
      vote.identityVerificationPolicy.required
    ) {
      throw new ParticipationAccessSessionInvalidError();
    }
    const validState =
      expectedScope === ParticipantSessionScope.Participate
        ? vote.status === VoteStatus.Finalized ||
          vote.status === VoteStatus.Open
        : vote.status === VoteStatus.Closed;
    if (!validState) throw new ParticipationAccessSessionInvalidError();

    await this.access.saveSession(session);
    return ParticipationAccessSessionView.of({
      sessionId: session.id,
      invitationId: session.invitationId,
      voteId: session.voteId,
      electorId: session.electorId,
      scope: session.scope,
    });
  }
}
