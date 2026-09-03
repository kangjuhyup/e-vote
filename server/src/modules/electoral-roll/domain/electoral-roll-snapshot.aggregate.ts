import { DomainError } from '../../../shared/domain/domain-error';
import { assertPositiveNumber, createId } from '../../../shared/domain/id';

export type ElectoralRollSnapshotMemberParams = {
  readonly id: string;
  readonly sourceMemberId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly encryptedName?: string;
  readonly encryptedPhoneNumber?: string;
  readonly encryptedBirthDate?: string;
  readonly identityNameHash?: string;
  readonly identityPhoneNumberHash?: string;
  readonly identityBirthDateHash?: string;
};

export class ElectoralRollSnapshotMember {
  readonly id: string;
  readonly sourceMemberId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly encryptedName?: string;
  readonly encryptedPhoneNumber?: string;
  readonly encryptedBirthDate?: string;
  readonly identityNameHash?: string;
  readonly identityPhoneNumberHash?: string;
  readonly identityBirthDateHash?: string;

  private constructor(params: ElectoralRollSnapshotMemberParams) {
    const identifier = params.identifier.trim();

    if (identifier.length === 0) {
      throw new DomainError('snapshot member identifier must not be empty');
    }
    assertPositiveNumber(params.voteWeight, 'voteWeight');

    this.id = createId(params.id);
    this.sourceMemberId = createId(params.sourceMemberId);
    this.identifier = identifier;
    this.groupKey = params.groupKey?.trim() || undefined;
    this.voteWeight = params.voteWeight;
    this.encryptedName = params.encryptedName?.trim() || undefined;
    this.encryptedPhoneNumber =
      params.encryptedPhoneNumber?.trim() || undefined;
    this.encryptedBirthDate = params.encryptedBirthDate?.trim() || undefined;
    this.identityNameHash = params.identityNameHash?.trim() || undefined;
    this.identityPhoneNumberHash =
      params.identityPhoneNumberHash?.trim() || undefined;
    this.identityBirthDateHash =
      params.identityBirthDateHash?.trim() || undefined;
    Object.freeze(this);
  }

  static of(
    params: ElectoralRollSnapshotMemberParams,
  ): ElectoralRollSnapshotMember {
    return new ElectoralRollSnapshotMember(params);
  }
}

type ElectoralRollSnapshotParams = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly rollName: string;
  readonly sourceRevision: number;
  readonly contentHash: string;
  readonly members: readonly ElectoralRollSnapshotMember[];
  readonly createdAt: Date;
};

export class ElectoralRollSnapshotAggregate {
  readonly members: readonly ElectoralRollSnapshotMember[];
  readonly memberCount: number;

  private constructor(
    readonly id: string,
    readonly electoralRollId: string,
    readonly rollName: string,
    readonly sourceRevision: number,
    readonly contentHash: string,
    members: readonly ElectoralRollSnapshotMember[],
    readonly createdAt: Date,
  ) {
    this.members = Object.freeze([...members]);
    this.memberCount = members.length;
    Object.freeze(this);
  }

  static create(
    params: ElectoralRollSnapshotParams,
  ): ElectoralRollSnapshotAggregate {
    const rollName = params.rollName.trim();

    if (rollName.length === 0) {
      throw new DomainError('snapshot roll name must not be empty');
    }
    if (!Number.isInteger(params.sourceRevision) || params.sourceRevision < 1) {
      throw new DomainError(
        'snapshot source revision must be a positive integer',
      );
    }
    if (!/^[a-f0-9]{64}$/.test(params.contentHash)) {
      throw new DomainError(
        'snapshot content hash must be a SHA-256 hex digest',
      );
    }

    const identifiers = new Set(
      params.members.map((member) => member.identifier),
    );
    if (identifiers.size !== params.members.length) {
      throw new DomainError('snapshot member identifiers must be unique');
    }
    const groupWeights = new Map<string, number>();
    for (const member of params.members) {
      if (member.groupKey === undefined) continue;
      const existingWeight = groupWeights.get(member.groupKey);
      if (
        existingWeight !== undefined &&
        existingWeight !== member.voteWeight
      ) {
        throw new DomainError(
          'snapshot members in the same group must have the same vote weight',
        );
      }
      groupWeights.set(member.groupKey, member.voteWeight);
    }

    return new ElectoralRollSnapshotAggregate(
      createId(params.id),
      createId(params.electoralRollId),
      rollName,
      params.sourceRevision,
      params.contentHash,
      params.members,
      params.createdAt,
    );
  }

  static reconstitute(
    params: ElectoralRollSnapshotParams,
  ): ElectoralRollSnapshotAggregate {
    return ElectoralRollSnapshotAggregate.create(params);
  }

  hasCompleteIdentityVerificationData(): boolean {
    return this.members.every(
      (member) =>
        member.identityNameHash !== undefined &&
        member.identityPhoneNumberHash !== undefined &&
        member.encryptedName !== undefined &&
        member.encryptedPhoneNumber !== undefined,
    );
  }
}
