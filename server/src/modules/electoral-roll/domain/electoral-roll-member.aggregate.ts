import { DomainError } from '../../../shared/domain/domain-error';
import { assertPositiveNumber, createId } from '../../../shared/domain/id';

type ElectoralRollMemberParams = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight?: number;
  readonly encryptedName?: string;
  readonly encryptedPhoneNumber?: string;
  readonly encryptedBirthDate?: string;
  readonly identityNameHash?: string;
  readonly identityPhoneNumberHash?: string;
  readonly identityBirthDateHash?: string;
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
    public encryptedName: string | undefined,
    public encryptedPhoneNumber: string | undefined,
    public encryptedBirthDate: string | undefined,
    public identityNameHash: string | undefined,
    public identityPhoneNumberHash: string | undefined,
    public identityBirthDateHash: string | undefined,
    readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(
    params: ElectoralRollMemberParams,
  ): ElectoralRollMemberAggregate {
    return ElectoralRollMemberAggregate.build(params);
  }

  static reconstitute(
    params: ElectoralRollMemberParams & {
      readonly voteWeight: number;
      readonly updatedAt: Date;
    },
  ): ElectoralRollMemberAggregate {
    return ElectoralRollMemberAggregate.build(params);
  }

  update(
    params: {
      readonly identifier: string;
      readonly groupKey?: string;
      readonly voteWeight: number;
      readonly encryptedName?: string;
      readonly encryptedPhoneNumber?: string;
      readonly encryptedBirthDate?: string;
      readonly identityNameHash?: string;
      readonly identityPhoneNumberHash?: string;
      readonly identityBirthDateHash?: string;
    },
    changedAt: Date,
  ): void {
    const values = ElectoralRollMemberAggregate.normalize(params);
    this.identifier = values.identifier;
    this.groupKey = values.groupKey;
    this.voteWeight = values.voteWeight;
    if (params.encryptedName !== undefined) {
      this.encryptedName = normalizeOptionalValue(params.encryptedName);
    }
    if (params.encryptedPhoneNumber !== undefined) {
      this.encryptedPhoneNumber = normalizeOptionalValue(
        params.encryptedPhoneNumber,
      );
    }
    if (params.encryptedBirthDate !== undefined) {
      this.encryptedBirthDate = normalizeOptionalValue(
        params.encryptedBirthDate,
      );
    }
    if (params.identityNameHash !== undefined) {
      this.identityNameHash = normalizeOptionalValue(params.identityNameHash);
    }
    if (params.identityPhoneNumberHash !== undefined) {
      this.identityPhoneNumberHash = normalizeOptionalValue(
        params.identityPhoneNumberHash,
      );
    }
    if (params.identityBirthDateHash !== undefined) {
      this.identityBirthDateHash = normalizeOptionalValue(
        params.identityBirthDateHash,
      );
    }
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
      normalizeOptionalValue(params.encryptedName),
      normalizeOptionalValue(params.encryptedPhoneNumber),
      normalizeOptionalValue(params.encryptedBirthDate),
      normalizeOptionalValue(params.identityNameHash),
      normalizeOptionalValue(params.identityPhoneNumberHash),
      normalizeOptionalValue(params.identityBirthDateHash),
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

function normalizeOptionalValue(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}
