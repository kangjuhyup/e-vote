import type { ElectionCommissionMemberRole } from '../../../../domain/election-commission/type/election-commission-member-role.type';
import type { ElectionCommissionMemberStatus } from '../../../../domain/election-commission/type/election-commission-member-status.type';
import type { ElectionCommissionStatus } from '../../../../domain/election-commission/type/election-commission-status.type';

export class ElectionCommissionMemberView {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly name: string,
    readonly role: ElectionCommissionMemberRole,
    readonly status: ElectionCommissionMemberStatus,
    readonly registeredAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: {
    readonly id: string;
    readonly commissionId: string;
    readonly name: string;
    readonly role: ElectionCommissionMemberRole;
    readonly status: ElectionCommissionMemberStatus;
    readonly registeredAt: Date;
    readonly updatedAt: Date;
  }): ElectionCommissionMemberView {
    return new ElectionCommissionMemberView(
      params.id,
      params.commissionId,
      params.name,
      params.role,
      params.status,
      params.registeredAt,
      params.updatedAt,
    );
  }
}

export class ElectionCommissionSummaryView {
  protected constructor(
    readonly id: string,
    readonly name: string,
    readonly status: ElectionCommissionStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: {
    readonly id: string;
    readonly name: string;
    readonly status: ElectionCommissionStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): ElectionCommissionSummaryView {
    return new ElectionCommissionSummaryView(
      params.id,
      params.name,
      params.status,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export class ElectionCommissionView extends ElectionCommissionSummaryView {
  private constructor(
    id: string,
    name: string,
    status: ElectionCommissionStatus,
    readonly members: readonly ElectionCommissionMemberView[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, name, status, createdAt, updatedAt);
  }

  static of(params: {
    readonly id: string;
    readonly name: string;
    readonly status: ElectionCommissionStatus;
    readonly members: readonly ElectionCommissionMemberView[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): ElectionCommissionView {
    return new ElectionCommissionView(
      params.id,
      params.name,
      params.status,
      params.members,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export class ElectionCommissionPageView {
  private constructor(
    readonly items: readonly ElectionCommissionSummaryView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: {
    readonly items: readonly ElectionCommissionSummaryView[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }): ElectionCommissionPageView {
    return new ElectionCommissionPageView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
