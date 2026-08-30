import { DomainError } from '../shared/domain-error';
import { assertPositiveNumber, createId } from '../shared/id';

type ElectoralRollMemberParams = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight?: number;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
};

export class ElectoralRollMemberAggregate {
  private constructor(
    readonly id: string,
    readonly electoralRollId: string,
    public identifier: string,
    public groupKey: string | undefined,
    public voteWeight: number,
    readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(
    params: ElectoralRollMemberParams,
  ): ElectoralRollMemberAggregate {
    return ElectoralRollMemberAggregate.build(params);
  }

  static reconstitute(
    params: Required<Omit<ElectoralRollMemberParams, 'groupKey'>> & {
      readonly groupKey?: string;
    },
  ): ElectoralRollMemberAggregate {
    return ElectoralRollMemberAggregate.build(params);
  }

  update(
    params: {
      readonly identifier: string;
      readonly groupKey?: string;
      readonly voteWeight: number;
    },
    changedAt: Date,
  ): void {
    const values = ElectoralRollMemberAggregate.normalize(params);
    this.identifier = values.identifier;
    this.groupKey = values.groupKey;
    this.voteWeight = values.voteWeight;
    this.updatedAt = changedAt;
  }

  private static build(
    params: ElectoralRollMemberParams,
  ): ElectoralRollMemberAggregate {
    const values = ElectoralRollMemberAggregate.normalize({
      identifier: params.identifier,
      groupKey: params.groupKey,
      voteWeight: params.voteWeight ?? 1,
    });

    return new ElectoralRollMemberAggregate(
      createId(params.id),
      createId(params.electoralRollId),
      values.identifier,
      values.groupKey,
      values.voteWeight,
      params.createdAt,
      params.updatedAt ?? params.createdAt,
    );
  }

  private static normalize(params: {
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
  }): {
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
  } {
    const identifier = params.identifier.trim();

    if (identifier.length === 0) {
      throw new DomainError(
        'electoral roll member identifier must not be empty',
      );
    }

    assertPositiveNumber(params.voteWeight, 'voteWeight');

    return {
      identifier,
      groupKey: params.groupKey?.trim() || undefined,
      voteWeight: params.voteWeight,
    };
  }
}
