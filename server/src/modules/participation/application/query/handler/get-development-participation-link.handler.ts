import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  DEVELOPMENT_PARTICIPATION_LINK_READ_PORT,
  type DevelopmentParticipationLinkReadPort,
} from '../../port/persistence/query/development-participation-link-read.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';
import { PARTICIPATION_UI_URL } from '../../port/gateway/participation-invitation-sms-sender.port';
import { GetDevelopmentParticipationLinkQuery } from '../dto/request/get-development-participation-link.query';
import { DevelopmentParticipationLinkView } from '../dto/response/development-participation-link.view';
import {
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
  DevelopmentParticipationLinkNotFoundError,
  DevelopmentParticipationLinkVoteNotFoundError,
} from '../development-participation-link.error';

@Injectable()
export class GetDevelopmentParticipationLinkHandler {
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
    query: GetDevelopmentParticipationLinkQuery,
  ): Promise<DevelopmentParticipationLinkView> {
    const vote = await this.votes.findById(query.voteId);
    if (!vote) throw new DevelopmentParticipationLinkVoteNotFoundError();
    if (!vote.isCreatedBy(query.requestedByUserPrincipalId)) {
      throw new DevelopmentParticipationLinkAccessDeniedError();
    }

    const invitation = await this.links.findCurrentInvitation({
      voteId: query.voteId,
      electorId: query.electorId,
    });
    if (!invitation) throw new DevelopmentParticipationLinkNotFoundError();

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
