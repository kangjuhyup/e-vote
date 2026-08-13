import type { VoteDetailType } from '../../domain/vote/type/vote-detail.type';
import type { VotePolicyOverrides } from '../../domain/vote/vo/vote-policy.vo';

export class CreateVoteDetailCommand {
  private constructor(
    readonly voteId: string,
    readonly title: string,
    readonly type: VoteDetailType,
    readonly sortOrder: number,
    readonly overrides?: VotePolicyOverrides,
  ) {}

  static of(params: {
    voteId: string;
    title: string;
    type: VoteDetailType;
    sortOrder?: number;
    overrides?: VotePolicyOverrides;
  }): CreateVoteDetailCommand {
    return new CreateVoteDetailCommand(
      params.voteId,
      params.title,
      params.type,
      params.sortOrder ?? 0,
      params.overrides,
    );
  }
}
