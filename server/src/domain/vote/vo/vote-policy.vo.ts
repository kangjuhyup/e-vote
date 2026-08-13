import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../type/vote-policy.type';

export type VotePolicyProps = {
  readonly privacyMode: PrivacyMode;
  readonly participationUnit: ParticipationUnit;
  readonly resultStorageMode: ResultStorageMode;
  readonly voteWeightMode: VoteWeightMode;
};

export class VotePolicy {
  private constructor(
    readonly privacyMode: PrivacyMode,
    readonly participationUnit: ParticipationUnit,
    readonly resultStorageMode: ResultStorageMode,
    readonly voteWeightMode: VoteWeightMode,
  ) {}

  static of(params: VotePolicyProps): VotePolicy {
    return new VotePolicy(
      params.privacyMode,
      params.participationUnit,
      params.resultStorageMode,
      params.voteWeightMode,
    );
  }

  overrideWith(overrides: VotePolicyOverrides): VotePolicy {
    return VotePolicy.of({
      privacyMode: overrides.privacyMode ?? this.privacyMode,
      participationUnit: overrides.participationUnit ?? this.participationUnit,
      resultStorageMode: overrides.resultStorageMode ?? this.resultStorageMode,
      voteWeightMode: overrides.voteWeightMode ?? this.voteWeightMode,
    });
  }
}

export type VotePolicyOverrides = Partial<VotePolicyProps>;
