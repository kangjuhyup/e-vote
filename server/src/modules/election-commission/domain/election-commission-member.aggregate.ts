import { DomainError } from '../../../shared/domain/domain-error';
import { createId } from '../../../shared/domain/id';
import {
  ElectionCommissionDomainEvent,
  ElectionCommissionMemberDeactivated,
  ElectionCommissionMemberRegistered,
} from './election-commission.events';
import { ElectionCommissionMemberRole } from './type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from './type/election-commission-member-status.type';

interface ElectionCommissionMemberParams {
  readonly id: string;
  readonly commissionId: string;
  readonly userPrincipalId?: string;
  readonly name: string;
  readonly role: ElectionCommissionMemberRole;
  readonly registeredAt: Date;
  readonly status?: ElectionCommissionMemberStatus;
}

type CreateElectionCommissionMemberParams = ElectionCommissionMemberParams & {
  readonly userPrincipalId: string;
};

type ReconstituteElectionCommissionMemberParams =
  ElectionCommissionMemberParams & {
    readonly status: ElectionCommissionMemberStatus;
  };

export class ElectionCommissionMemberAggregate {
  private readonly events: ElectionCommissionDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly userPrincipalId: string | undefined,
    readonly name: string,
    readonly role: ElectionCommissionMemberRole,
    public status: ElectionCommissionMemberStatus,
  ) {}

  static create(
    params: CreateElectionCommissionMemberParams,
  ): ElectionCommissionMemberAggregate {
    if (
      typeof params.userPrincipalId !== 'string' ||
      params.userPrincipalId.trim().length === 0
    ) {
      throw new DomainError('user principal id must not be empty');
    }

    const member = ElectionCommissionMemberAggregate.build(params);

    member.events.push(
      ElectionCommissionMemberRegistered.of({
        aggregateId: member.id,
        occurredAt: params.registeredAt,
      }),
    );

    return member;
  }

  static reconstitute(
    params: ReconstituteElectionCommissionMemberParams,
  ): ElectionCommissionMemberAggregate {
    return ElectionCommissionMemberAggregate.build(params);
  }

  canManageFieldVoting(commissionId: string): boolean {
    return (
      this.commissionId === commissionId &&
      this.status === ElectionCommissionMemberStatus.Active &&
      (this.role === ElectionCommissionMemberRole.Admin ||
        this.role === ElectionCommissionMemberRole.FieldManager)
    );
  }

  deactivate(deactivatedAt: Date): void {
    if (this.status === ElectionCommissionMemberStatus.Inactive) {
      throw new DomainError('election commission member is already inactive');
    }

    this.status = ElectionCommissionMemberStatus.Inactive;
    this.events.push(
      ElectionCommissionMemberDeactivated.of({
        aggregateId: this.id,
        occurredAt: deactivatedAt,
      }),
    );
  }

  pullEvents(): ElectionCommissionDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }

  private static build(
    params: ElectionCommissionMemberParams,
  ): ElectionCommissionMemberAggregate {
    const id = createId(params.id);
    const commissionId = createId(params.commissionId);
    const userPrincipalId = params.userPrincipalId?.trim();
    const name = params.name.trim();

    if (params.userPrincipalId !== undefined && !userPrincipalId) {
      throw new DomainError('user principal id must not be empty');
    }

    if (name.length === 0) {
      throw new DomainError(
        'election commission member name must not be empty',
      );
    }

    return new ElectionCommissionMemberAggregate(
      id,
      commissionId,
      userPrincipalId,
      name,
      params.role,
      params.status ?? ElectionCommissionMemberStatus.Active,
    );
  }
}
