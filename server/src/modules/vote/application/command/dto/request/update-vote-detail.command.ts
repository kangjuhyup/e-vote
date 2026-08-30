import type { VoteDetailType } from '../../../../../../shared/domain/voting/type/vote-detail.type';
import type { VotePolicyOverrides } from '../../../../../../shared/domain/voting/vo/vote-policy.vo';

export class UpdateVoteDetailCommand {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly title: string,
    readonly type: VoteDetailType,
    readonly sortOrder: number,
    readonly overrides?: VotePolicyOverrides,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
    readonly title: string;
    readonly type: VoteDetailType;
    readonly sortOrder: number;
    readonly overrides?: VotePolicyOverrides;
  }): UpdateVoteDetailCommand {
    return new UpdateVoteDetailCommand(
      params.voteId,
      params.voteDetailId,
      params.title,
      params.type,
      params.sortOrder,
      params.overrides,
    );
  }
}
