export const PARTICIPATION_ACCESS_READ_PORT = Symbol(
  'PARTICIPATION_ACCESS_READ_PORT',
);

export type ParticipationAccessReadView = {
  readonly vote: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly status: string;
    readonly startedAt: Date;
    readonly endedAt: Date;
    readonly identityVerificationRequired: boolean;
  };
  readonly elector: {
    readonly label: string;
    readonly status: string;
    readonly identityVerified: boolean;
  };
  readonly ballots: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly type: string;
    readonly status: string;
    readonly sortOrder: number;
    readonly participated: boolean;
    readonly candidates: readonly {
      readonly id: string;
      readonly candidateNo: number;
      readonly name: string;
      readonly description: string;
    }[];
  }[];
};

export interface ParticipationAccessReadPort {
  find(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationAccessReadView | undefined>;
}
