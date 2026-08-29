import type { ElectorStatus } from '../../../domain/elector/type/elector-status.type';

export type ElectorViewProps = {
  readonly id: string;
  readonly voteId: string;
  readonly name: string;
  readonly identifier: string;
  readonly phoneNumber?: string;
  readonly birthDate?: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly status: ElectorStatus;
  readonly identityVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class ElectorView {
  readonly phoneNumber?: string;
  readonly birthDate?: string;
  readonly groupKey?: string;

  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly name: string,
    readonly identifier: string,
    phoneNumber: string | undefined,
    birthDate: string | undefined,
    groupKey: string | undefined,
    readonly voteWeight: number,
    readonly status: ElectorStatus,
    readonly identityVerified: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (phoneNumber !== undefined) {
      this.phoneNumber = phoneNumber;
    }
    if (birthDate !== undefined) {
      this.birthDate = birthDate;
    }
    if (groupKey !== undefined) {
      this.groupKey = groupKey;
    }
  }

  static of(params: ElectorViewProps): ElectorView {
    return new ElectorView(
      params.id,
      params.voteId,
      params.name,
      params.identifier,
      params.phoneNumber,
      params.birthDate,
      params.groupKey,
      params.voteWeight,
      params.status,
      params.identityVerified,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export type ElectorPageViewProps = {
  readonly items: readonly ElectorView[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class ElectorPageView {
  private constructor(
    readonly items: readonly ElectorView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: ElectorPageViewProps): ElectorPageView {
    return new ElectorPageView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
