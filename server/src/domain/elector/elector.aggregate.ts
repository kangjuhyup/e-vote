import { DomainError } from '../shared/domain-error';
import { assertPositiveNumber, createId } from '../shared/id';
import { ElectorStatus } from './type/elector-status.type';

interface CreateElectorParams {
  readonly id: string;
  readonly voteId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight?: number;
  readonly status?: ElectorStatus;
  readonly identityVerified?: boolean;
}

export class ElectorAggregate {
  private identityVerified: boolean;

  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
    readonly status: ElectorStatus,
    identityVerified: boolean,
  ) {
    this.identityVerified = identityVerified;
  }

  static create(params: CreateElectorParams): ElectorAggregate {
    const id = createId(params.id);
    const voteId = createId(params.voteId);
    const identifier = params.identifier.trim();
    const voteWeight = params.voteWeight ?? 1;

    if (identifier.length === 0) {
      throw new DomainError('elector identifier must not be empty');
    }

    assertPositiveNumber(voteWeight, 'voteWeight');

    return new ElectorAggregate(
      id,
      voteId,
      identifier,
      params.groupKey?.trim() || undefined,
      voteWeight,
      params.status ?? ElectorStatus.Eligible,
      params.identityVerified ?? false,
    );
  }

  markIdentityVerified(): void {
    this.identityVerified = true;
  }

  isIdentityVerified(): boolean {
    return this.identityVerified;
  }
}
