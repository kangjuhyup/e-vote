type ElectoralRollMemberViewProps = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly name?: string;
  readonly phoneNumber?: string;
  readonly birthDate?: string;
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
    readonly name: string | undefined,
    readonly phoneNumber: string | undefined,
    readonly birthDate: string | undefined,
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
      params.name,
      params.phoneNumber,
      params.birthDate,
      params.createdAt,
      params.updatedAt,
    );
  }
}

type ElectoralRollViewProps = {
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly members: readonly ElectoralRollMemberView[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class ElectoralRollView {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly revision: number,
    readonly members: readonly ElectoralRollMemberView[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: ElectoralRollViewProps): ElectoralRollView {
    return new ElectoralRollView(
      params.id,
      params.name,
      params.revision,
      params.members,
      params.createdAt,
      params.updatedAt,
    );
  }
}

type ElectoralRollPageItemViewProps = {
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly memberCount: number;
  readonly updatedAt: Date;
};

export class ElectoralRollPageItemView {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly revision: number,
    readonly memberCount: number,
    readonly updatedAt: Date,
  ) {}

  static of(params: ElectoralRollPageItemViewProps): ElectoralRollPageItemView {
    return new ElectoralRollPageItemView(
      params.id,
      params.name,
      params.revision,
      params.memberCount,
      params.updatedAt,
    );
  }
}

export class ElectoralRollPageView {
  private constructor(
    readonly items: readonly ElectoralRollPageItemView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: {
    readonly items: readonly ElectoralRollPageItemView[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }): ElectoralRollPageView {
    return new ElectoralRollPageView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
