export type ElectoralRollMemberViewProps = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class ElectoralRollMemberView {
  readonly groupKey?: string;

  private constructor(
    readonly id: string,
    readonly electoralRollId: string,
    readonly identifier: string,
    groupKey: string | undefined,
    readonly voteWeight: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (groupKey !== undefined) this.groupKey = groupKey;
  }

  static of(params: ElectoralRollMemberViewProps): ElectoralRollMemberView {
    return new ElectoralRollMemberView(
      params.id,
      params.electoralRollId,
      params.identifier,
      params.groupKey,
      params.voteWeight,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export type ElectoralRollViewProps = {
  readonly id: string;
  readonly commissionId: string;
  readonly name: string;
  readonly revision: number;
  readonly members: readonly ElectoralRollMemberView[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class ElectoralRollView {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly name: string,
    readonly revision: number,
    readonly members: readonly ElectoralRollMemberView[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: ElectoralRollViewProps): ElectoralRollView {
    return new ElectoralRollView(
      params.id,
      params.commissionId,
      params.name,
      params.revision,
      params.members,
      params.createdAt,
      params.updatedAt,
    );
  }
}
