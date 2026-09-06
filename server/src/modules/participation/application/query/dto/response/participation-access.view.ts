import type { ParticipantSessionScope } from '../../../../domain/access/elector-participant-session.aggregate';
import type { VoteDetailType } from '../../../../../../shared/domain/voting/type/vote-detail.type';
import type {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../../../shared/domain/voting/type/vote-status.type';

export class ParticipationAccessCandidateView {
  private constructor(
    readonly id: string,
    readonly candidateNo: number,
    readonly name: string,
    readonly description: string,
  ) {}

  static of(
    params: ParticipationAccessCandidateView,
  ): ParticipationAccessCandidateView {
    return new ParticipationAccessCandidateView(
      params.id,
      params.candidateNo,
      params.name,
      params.description,
    );
  }
}

export class ParticipationAccessVoteDetailView {
  private constructor(
    readonly id: string,
    readonly title: string,
    readonly description: string,
    readonly type: VoteDetailType,
    readonly status: VoteDetailStatus,
    readonly sortOrder: number,
    readonly participated: boolean,
    readonly candidates: readonly ParticipationAccessCandidateView[],
  ) {}

  static of(
    params: ParticipationAccessVoteDetailView,
  ): ParticipationAccessVoteDetailView {
    return new ParticipationAccessVoteDetailView(
      params.id,
      params.title,
      params.description,
      params.type,
      params.status,
      params.sortOrder,
      params.participated,
      params.candidates,
    );
  }
}

export class ParticipationAccessBallotView {
  private constructor(
    readonly vote: {
      readonly id: string;
      readonly title: string;
      readonly description: string;
      readonly status: VoteStatus;
      readonly startedAt: Date;
      readonly endedAt: Date;
    },
    readonly hasConfirmedSignature: boolean,
    readonly voteDetails: readonly ParticipationAccessVoteDetailView[],
  ) {}

  static of(
    params: ParticipationAccessBallotView,
  ): ParticipationAccessBallotView {
    return new ParticipationAccessBallotView(
      params.vote,
      params.hasConfirmedSignature,
      params.voteDetails,
    );
  }
}

export class ParticipationAccessView {
  private constructor(
    readonly scope: ParticipantSessionScope,
    readonly csrfToken: string,
    readonly vote: ParticipationAccessBallotView['vote'],
    readonly hasConfirmedSignature: boolean,
    readonly voteDetails: readonly ParticipationAccessVoteDetailView[],
    readonly permittedActions: {
      readonly uploadSignature: boolean;
      readonly participate: boolean;
      readonly readResults: boolean;
    },
  ) {}

  static of(params: ParticipationAccessView): ParticipationAccessView {
    return new ParticipationAccessView(
      params.scope,
      params.csrfToken,
      params.vote,
      params.hasConfirmedSignature,
      params.voteDetails,
      params.permittedActions,
    );
  }
}
