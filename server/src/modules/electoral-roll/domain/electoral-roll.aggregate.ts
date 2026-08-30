import { DomainError } from '../../../shared/domain/domain-error';
import { createId } from '../../../shared/domain/id';

type CreateElectoralRollParams = {
  readonly id: string;
  readonly commissionId: string;
  readonly name: string;
  readonly createdAt: Date;
};

type ReconstituteElectoralRollParams = CreateElectoralRollParams & {
  readonly revision: number;
  readonly updatedAt: Date;
};

export class ElectoralRollAggregate {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    public name: string,
    public revision: number,
    readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(params: CreateElectoralRollParams): ElectoralRollAggregate {
    return ElectoralRollAggregate.build({
      ...params,
      revision: 1,
      updatedAt: params.createdAt,
    });
  }

  static reconstitute(
    params: ReconstituteElectoralRollParams,
  ): ElectoralRollAggregate {
    return ElectoralRollAggregate.build(params);
  }

  rename(name: string, changedAt: Date): void {
    const normalizedName = ElectoralRollAggregate.normalizeName(name);

    if (normalizedName === this.name) {
      return;
    }

    this.name = normalizedName;
    this.advanceRevision(changedAt);
  }

  markMembersChanged(changedAt: Date): void {
    this.advanceRevision(changedAt);
  }

  private advanceRevision(changedAt: Date): void {
    this.revision += 1;
    this.updatedAt = changedAt;
  }

  private static build(
    params: ReconstituteElectoralRollParams,
  ): ElectoralRollAggregate {
    const id = createId(params.id);
    const commissionId = createId(params.commissionId);
    const name = ElectoralRollAggregate.normalizeName(params.name);

    if (!Number.isInteger(params.revision) || params.revision < 1) {
      throw new DomainError(
        'electoral roll revision must be a positive integer',
      );
    }

    return new ElectoralRollAggregate(
      id,
      commissionId,
      name,
      params.revision,
      params.createdAt,
      params.updatedAt,
    );
  }

  private static normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (normalizedName.length === 0) {
      throw new DomainError('electoral roll name must not be empty');
    }

    return normalizedName;
  }
}
