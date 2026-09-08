import { Inject, Injectable } from '@nestjs/common';

import { UserPrincipal } from '../../../shared/application/security/user-principal';
import {
  OrganizationApplicationAggregate,
  type OrganizationApplicationStatus,
  type OrganizationType,
} from '../domain/organization-application.aggregate';
import {
  OrganizationApplicationAccessDeniedError,
  OrganizationApplicationConflictError,
  OrganizationApplicationNotFoundError,
  OrganizationProvisioningUnavailableError,
} from './organization-onboarding.error';
import {
  AUTH_ORGANIZATION_PROVISIONING_PORT,
  type AuthOrganizationProvisioningPort,
} from './port/gateway/auth-organization-provisioning.port';
import {
  ORGANIZATION_APPLICATION_REPOSITORY_PORT,
  type OrganizationApplicationRepositoryPort,
} from './port/persistence/organization-application-repository.port';

export interface SubmitOrganizationApplicationInput {
  organizationName: string;
  organizationType: OrganizationType;
  contactName: string;
  contactPhone?: string;
}

@Injectable()
export class OrganizationOnboardingService {
  constructor(
    @Inject(ORGANIZATION_APPLICATION_REPOSITORY_PORT)
    private readonly repository: OrganizationApplicationRepositoryPort,
    @Inject(AUTH_ORGANIZATION_PROVISIONING_PORT)
    private readonly authProvisioning: AuthOrganizationProvisioningPort,
  ) {}

  async submit(user: UserPrincipal, input: SubmitOrganizationApplicationInput) {
    const tenantId = this.requireTenant(user).tenantId;
    const current = await this.repository.findCurrentByApplicant(
      tenantId,
      user.id,
    );
    if (
      current &&
      ['PENDING', 'PROVISIONING', 'APPROVED', 'PROVISIONING_FAILED'].includes(
        current.props.status,
      )
    ) {
      throw new OrganizationApplicationConflictError();
    }
    const application = OrganizationApplicationAggregate.create({
      id: this.repository.nextId(),
      tenantId,
      tenantCode: this.requireTenant(user).tenantCode,
      applicantUserPrincipalId: user.id,
      ...input,
      submittedAt: new Date(),
    });
    await this.repository.save(application);
    return application;
  }

  async getMine(user: UserPrincipal) {
    const { tenantId } = this.requireTenant(user);
    const application = await this.repository.findCurrentByApplicant(
      tenantId,
      user.id,
    );
    if (!application) throw new OrganizationApplicationNotFoundError();
    return application;
  }

  async getPage(
    user: UserPrincipal,
    input: {
      page: number;
      pageSize: number;
      status?: OrganizationApplicationStatus;
    },
  ) {
    this.assertVoteAdmin(user);
    const { tenantId } = this.requireTenant(user);
    return this.repository.findPage({ tenantId, ...input });
  }

  async approve(user: UserPrincipal, id: string, retry = false) {
    this.assertVoteAdmin(user);
    const { tenantId } = this.requireTenant(user);
    const application = await this.repository.beginProvisioning({
      id,
      tenantId,
      reviewerId: user.id,
      reviewedAt: new Date(),
      retry,
    });
    try {
      const result = await this.authProvisioning.provision({
        tenantCode: application.props.tenantCode,
        applicantUserId: application.props.applicantUserPrincipalId,
        organizationName: application.props.organizationName,
        organizationManagementNumber:
          application.props.organizationManagementNumber,
      });
      return await this.repository.markApproved({
        id,
        authOrganizationGroupId: result.organizationGroup.id,
        authOrganizationGroupCode: result.organizationGroup.code,
        authManagerGroupId: result.managerGroup.id,
        authManagerGroupCode: result.managerGroup.code,
        authManagerParentGroupId: result.managerGroup.parentId,
      });
    } catch {
      await this.repository.markProvisioningFailed(
        id,
        'AUTH_PROVISIONING_FAILED',
      );
      throw new OrganizationProvisioningUnavailableError();
    }
  }

  async reject(user: UserPrincipal, id: string, rejectionReason: string) {
    this.assertVoteAdmin(user);
    const reason = rejectionReason.trim();
    if (!reason) throw new TypeError('rejection reason must not be empty');
    const existing = await this.repository.findById(id);
    if (
      !existing ||
      existing.props.tenantId !== this.requireTenant(user).tenantId
    ) {
      throw new OrganizationApplicationNotFoundError();
    }
    return this.repository.reject({
      id,
      reviewerId: user.id,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
  }

  private assertVoteAdmin(user: UserPrincipal) {
    if (!user.roles.includes('vote-admin')) {
      throw new OrganizationApplicationAccessDeniedError();
    }
  }

  private requireTenant(user: UserPrincipal): {
    tenantId: string;
    tenantCode: string;
  } {
    if (!user.tenantId || !user.tenantCode) {
      throw new OrganizationApplicationAccessDeniedError();
    }
    return { tenantId: user.tenantId, tenantCode: user.tenantCode };
  }
}
