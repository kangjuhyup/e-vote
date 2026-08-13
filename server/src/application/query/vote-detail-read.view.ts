import type { VoteDetailType } from '../../domain/vote/type/vote-detail.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../domain/vote/type/vote-policy.type';
import type { VoteDetailStatus } from '../../domain/vote/type/vote-status.type';

export type VoteDetailPolicyOverridesReadViewProps = {
  readonly privacyMode?: PrivacyMode;
  readonly participationUnit?: ParticipationUnit;
  readonly resultStorageMode?: ResultStorageMode;
  readonly voteWeightMode?: VoteWeightMode;
};

export class VoteDetailPolicyOverridesReadView {
  readonly privacyMode?: PrivacyMode;
  readonly participationUnit?: ParticipationUnit;
  readonly resultStorageMode?: ResultStorageMode;
  readonly voteWeightMode?: VoteWeightMode;

  private constructor(params: VoteDetailPolicyOverridesReadViewProps) {
    if (params.privacyMode !== undefined) {
      this.privacyMode = params.privacyMode;
    }
    if (params.participationUnit !== undefined) {
      this.participationUnit = params.participationUnit;
    }
    if (params.resultStorageMode !== undefined) {
      this.resultStorageMode = params.resultStorageMode;
    }
    if (params.voteWeightMode !== undefined) {
      this.voteWeightMode = params.voteWeightMode;
    }
  }

  static of(
    params: VoteDetailPolicyOverridesReadViewProps,
  ): VoteDetailPolicyOverridesReadView {
    return new VoteDetailPolicyOverridesReadView(params);
  }
}

export type VoteDetailReadViewProps = {
  readonly id: string;
  readonly voteId: string;
  readonly title: string;
  readonly description: string;
  readonly type: VoteDetailType;
  readonly overrides?: VoteDetailPolicyOverridesReadView;
  readonly sortOrder: number;
  readonly status: VoteDetailStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class VoteDetailReadView {
  readonly overrides?: VoteDetailPolicyOverridesReadView;

  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly title: string,
    readonly description: string,
    readonly type: VoteDetailType,
    overrides: VoteDetailPolicyOverridesReadView | undefined,
    readonly sortOrder: number,
    readonly status: VoteDetailStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (overrides !== undefined) {
      this.overrides = overrides;
    }
  }

  static of(params: VoteDetailReadViewProps): VoteDetailReadView {
    return new VoteDetailReadView(
      params.id,
      params.voteId,
      params.title,
      params.description,
      params.type,
      params.overrides,
      params.sortOrder,
      params.status,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export type VoteDetailPageReadViewProps = {
  readonly items: readonly VoteDetailReadView[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class VoteDetailPageReadView {
  private constructor(
    readonly items: readonly VoteDetailReadView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: VoteDetailPageReadViewProps): VoteDetailPageReadView {
    return new VoteDetailPageReadView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
