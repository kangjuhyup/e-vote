import { Injectable } from '@nestjs/common';
import { VotingChannel } from '../../../../../shared/domain/voting/type/voting-channel.type';
import { CastParticipationCommand } from '../dto/request/cast-participation.command';
import { CastParticipationHandler } from './cast-participation.handler';
import { ParticipationInvitationResolver } from '../../participation-invitation.resolver';

@Injectable()
export class CastParticipationWithInvitationHandler {
  constructor(
    private readonly resolver: ParticipationInvitationResolver,
    private readonly castParticipation: CastParticipationHandler,
  ) {}

  async execute(rawToken: string, voteDetailId: string, candidateId: string) {
    const invitation = await this.resolver.resolve(rawToken);
    return this.castParticipation.execute(
      CastParticipationCommand.of({
        voteId: invitation.voteId,
        voteDetailId,
        electorId: invitation.electorId,
        selectedCandidateId: candidateId,
        votingChannel: VotingChannel.Online,
        participatedAt: new Date(),
      }),
    );
  }
}
