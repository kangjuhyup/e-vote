import { DomainError } from '../shared/domain-error';
import { assertPositiveNumber, createId } from '../shared/id';
import { ElectorStatus } from './type/elector-status.type';

interface CreateElectorParams {
  readonly id: string;
  readonly voteId: string;
  readonly name?: string;
  readonly identifier: string;
  readonly phoneNumber?: string;
  readonly birthDate?: string;
  readonly groupKey?: string;
  readonly voteWeight?: number;
  readonly status?: ElectorStatus;
  readonly identityVerified?: boolean;
}

type ReconstituteElectorParams = CreateElectorParams & {
  readonly voteWeight: number;
  readonly status: ElectorStatus;
  readonly identityVerified: boolean;
};

export class ElectorAggregate {
  private identityVerified: boolean;

  private constructor(
    readonly id: string,
    readonly voteId: string,
    public name: string,
    public identifier: string,
    public phoneNumber: string | undefined,
    public birthDate: string | undefined,
    public groupKey: string | undefined,
    public voteWeight: number,
    public status: ElectorStatus,
    identityVerified: boolean,
  ) {
    this.identityVerified = identityVerified;
  }

  static create(params: CreateElectorParams): ElectorAggregate {
    const id = createId(params.id);
    const voteId = createId(params.voteId);
    const identifier = params.identifier.trim();
    const name = params.name?.trim() || identifier;
    const phoneNumber = params.phoneNumber?.trim() || undefined;
    const birthDate = params.birthDate?.trim() || undefined;
    const voteWeight = params.voteWeight ?? 1;

    if (identifier.length === 0) {
      throw new DomainError('elector identifier must not be empty');
    }

    if (name.length === 0) {
      throw new DomainError('elector name must not be empty');
    }

    assertPositiveNumber(voteWeight, 'voteWeight');

    return new ElectorAggregate(
      id,
      voteId,
      name,
      identifier,
      phoneNumber,
      birthDate,
      params.groupKey?.trim() || undefined,
      voteWeight,
      params.status ?? ElectorStatus.Eligible,
      params.identityVerified ?? false,
    );
  }

  static reconstitute(params: ReconstituteElectorParams): ElectorAggregate {
    return ElectorAggregate.create(params);
  }

  markIdentityVerified(): void {
    this.identityVerified = true;
  }

  update(params: {
    readonly name: string;
    readonly identifier: string;
    readonly phoneNumber?: string;
    readonly birthDate?: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
  }): void {
    if (this.status !== ElectorStatus.Eligible) {
      throw new DomainError('only eligible electors can be updated');
    }
    const name = params.name.trim();
    const identifier = params.identifier.trim();
    if (name.length === 0)
      throw new DomainError('elector name must not be empty');
    if (identifier.length === 0)
      throw new DomainError('elector identifier must not be empty');
    assertPositiveNumber(params.voteWeight, 'voteWeight');

    this.name = name;
    this.identifier = identifier;
    this.phoneNumber = params.phoneNumber?.trim() || undefined;
    this.birthDate = params.birthDate?.trim() || undefined;
    this.groupKey = params.groupKey?.trim() || undefined;
    this.voteWeight = params.voteWeight;
  }

  block(): void {
    if (this.status === ElectorStatus.Blocked) {
      throw new DomainError('elector is already blocked');
    }
    this.status = ElectorStatus.Blocked;
  }

  isIdentityVerified(): boolean {
    return this.identityVerified;
  }
}
