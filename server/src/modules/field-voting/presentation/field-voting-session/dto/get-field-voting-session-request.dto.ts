import { IsUUID } from 'class-validator';

export class GetFieldVotingSessionParam {
  @IsUUID()
  readonly fieldVotingSessionId!: string;
}

export class GetFieldVotingSessionPageParam {
  @IsUUID()
  readonly voteId!: string;
}

export class GetFieldVotingSessionPageQuery {
  readonly page?: string;
  readonly pageSize?: string;
}
