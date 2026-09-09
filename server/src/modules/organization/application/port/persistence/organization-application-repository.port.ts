import type {
  OrganizationApplicationAggregate,
  OrganizationApplicationStatus,
} from '../../../domain/organization-application.aggregate';

export const ORGANIZATION_APPLICATION_REPOSITORY_PORT = Symbol(
  'ORGANIZATION_APPLICATION_REPOSITORY_PORT',
);

export interface OrganizationApplicationPageResult {
  readonly items: readonly OrganizationApplicationAggregate[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface OrganizationApplicationRepositoryPort {
  nextId(): string;
  save(application: OrganizationApplicationAggregate): Promise<void>;
  findCurrentByApplicant(
    tenantId: string,
    applicantId: string,
  ): Promise<OrganizationApplicationAggregate | undefined>;
  findById(id: string): Promise<OrganizationApplicationAggregate | undefined>;
  findApprovedByOrganizationGroupId(
    tenantId: string,
    organizationGroupId: string,
  ): Promise<OrganizationApplicationAggregate | undefined>;
  findPage(input: {
    tenantId: string;
    page: number;
    pageSize: number;
    status?: OrganizationApplicationStatus;
  }): Promise<OrganizationApplicationPageResult>;
  beginProvisioning(input: {
    id: string;
    tenantId: string;
    reviewerId: string;
    reviewedAt: Date;
    retry: boolean;
  }): Promise<OrganizationApplicationAggregate>;
  markApproved(input: {
    id: string;
    authOrganizationGroupId: string;
    authOrganizationGroupCode: string;
    authManagerGroupId: string;
    authManagerGroupCode: string;
    authManagerParentGroupId: string;
  }): Promise<OrganizationApplicationAggregate>;
  markProvisioningFailed(id: string, sanitizedError: string): Promise<void>;
  reject(input: {
    id: string;
    reviewerId: string;
    reviewedAt: Date;
    rejectionReason: string;
  }): Promise<OrganizationApplicationAggregate>;
}
