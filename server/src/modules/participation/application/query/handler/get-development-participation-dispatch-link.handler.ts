import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { PARTICIPATION_UI_URL } from '../../port/gateway/participation-invitation-sms-sender.port';
import {
  DEVELOPMENT_PARTICIPATION_LINK_READ_PORT,
  type DevelopmentParticipationLinkReadPort,
} from '../../port/persistence/query/development-participation-link-read.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';
import { GetDevelopmentParticipationDispatchLinkQuery } from '../dto/request/get-development-participation-dispatch-link.query';
import { DevelopmentParticipationLinkView } from '../dto/response/development-participation-link.view';
import {
  DevelopmentParticipationDispatchLinkNotFoundError,
  DevelopmentParticipationDispatchLinkStaleError,
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
  DevelopmentParticipationLinkVoteNotFoundError,
} from '../development-participation-link.error';

@Injectable()
export class GetDevelopmentParticipationDispatchLinkHandler {
  constructor(
    @Inject(VOTE_ACCESS_PORT) private readonly votes: VoteAccessPort,
    @Inject(DEVELOPMENT_PARTICIPATION_LINK_READ_PORT)
    private readonly links: DevelopmentParticipationLinkReadPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
    @Inject(PARTICIPATION_UI_URL)
    private readonly participationUiUrl: string,
  ) {}

  async execute(
    query: GetDevelopmentParticipationDispatchLinkQuery,
  ): Promise<DevelopmentParticipationLinkView> {
    const vote = await this.votes.findById(query.voteId);
    if (!vote) throw new DevelopmentParticipationLinkVoteNotFoundError();
    if (!vote.isCreatedBy(query.requestedByUserPrincipalId)) {
      throw new DevelopmentParticipationLinkAccessDeniedError();
    }

    const dispatch = await this.links.findDispatchInvitation({
      voteId: query.voteId,
      smsDispatchId: query.smsDispatchId,
      electorId: query.electorId,
    });
    if (!dispatch) {
      throw new DevelopmentParticipationDispatchLinkNotFoundError();
    }
    if (
      dispatch.invitationGeneration === undefined ||
      !dispatch.currentInvitation ||
      dispatch.invitationGeneration !== dispatch.currentInvitation.generation
    ) {
      throw new DevelopmentParticipationDispatchLinkStaleError();
    }

    const invitation = dispatch.currentInvitation;
    const reference = this.tokens.issueReference(
      invitation.id,
      invitation.generation,
    );
    if (
      reference.tokenDigest !== invitation.tokenDigest ||
      reference.keyId !== invitation.signingKeyId
    ) {
      throw new DevelopmentParticipationLinkMismatchError();
    }

    const linkBase = this.participationUiUrl
      .replace(/#.*$/, '')
      .replace(/\/$/, '');
    return DevelopmentParticipationLinkView.of({
      electorId: invitation.electorId,
      participationUrl: `${linkBase}#access_token=${reference.token}`,
    });
  }
}
