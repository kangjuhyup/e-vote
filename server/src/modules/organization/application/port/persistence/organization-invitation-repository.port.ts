import type { OrganizationInvitationAggregate } from '../../../domain/organization-invitation.aggregate';

export const ORGANIZATION_INVITATION_REPOSITORY_PORT = Symbol(
  'ORGANIZATION_INVITATION_REPOSITORY_PORT',
);

export interface OrganizationInvitationRepositoryPort {
  nextId(): string;
  save(invitation: OrganizationInvitationAggregate): Promise<void>;
  findByTokenHash(
    tokenHash: string,
  ): Promise<OrganizationInvitationAggregate | undefined>;
  markAccepted(input: {
    id: string;
    userPrincipalId: string;
    acceptedAt: Date;
  }): Promise<OrganizationInvitationAggregate>;
  findPage(input: {
    tenantId: string;
    organizationGroupId: string;
    page: number;
    pageSize: number;
  }): Promise<{
    items: readonly OrganizationInvitationAggregate[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }>;
}
