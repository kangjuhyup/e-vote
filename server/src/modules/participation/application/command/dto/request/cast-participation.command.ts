import type { VotingChannel } from '../../../../../../shared/domain/voting/type/voting-channel.type';

export class CastParticipationCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly electorId: string,
    readonly selectedCandidateId: string | undefined,
    readonly votingChannel: VotingChannel,
    readonly fieldVotingSessionId: string | undefined,
    readonly participatedAt: Date,
  ) {}

  static of(params: {
    userPrincipalId: string;
    voteId: string;
    voteDetailId: string;
    electorId: string;
    selectedCandidateId?: string;
    votingChannel: VotingChannel;
    fieldVotingSessionId?: string;
    participatedAt: Date;
  }): CastParticipationCommand {
    return new CastParticipationCommand(
      params.userPrincipalId,
      params.voteId,
      params.voteDetailId,
      params.electorId,
      params.selectedCandidateId,
      params.votingChannel,
      params.fieldVotingSessionId,
      params.participatedAt,
    );
  }
}
