export class GetFieldVotingSessionParam {
  readonly fieldVotingSessionId!: string;
}

export class GetFieldVotingSessionPageParam {
  readonly voteId!: string;
}

export class GetFieldVotingSessionPageQuery {
  readonly page?: string;
  readonly pageSize?: string;
}
