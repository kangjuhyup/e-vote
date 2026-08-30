import type { VoteDetailType } from '../../../../../../shared/domain/voting/type/vote-detail.type';
import type { VotePolicyOverrides } from '../../../../../../shared/domain/voting/vo/vote-policy.vo';

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
