import type { DatabaseEntityFactoryContext } from '../../../../../platform/database/entity/entity-factory-context';
type OrganizationApplicationStatus =
  'PENDING' | 'PROVISIONING' | 'APPROVED' | 'REJECTED' | 'PROVISIONING_FAILED';
type OrganizationType = 'APARTMENT' | 'ASSOCIATION' | 'COMPANY' | 'OTHER';

export function createOrganizationEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;
  const schema = defineEntity({
    name: 'OrganizationApplicationEntity',
    tableName: 'organization_applications',
    uniques: [
      {
        name: 'organization_applications_tenant_management_number_unique',
        properties: ['tenantId', 'organizationManagementNumber'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      tenantId: p.string().fieldName('tenant_id'),
      tenantCode: p.string().fieldName('tenant_code'),
      applicantUserPrincipalId: p
        .string()
        .fieldName('applicant_user_principal_id'),
      organizationName: p.string().fieldName('organization_name'),
      organizationManagementNumber: p
        .string()
        .fieldName('organization_management_number'),
      organizationType: p
        .string()
        .fieldName('organization_type')
        .$type<OrganizationType>(),
      contactName: p.string().fieldName('contact_name'),
      contactPhone: p.string().fieldName('contact_phone').nullable(),
      status: p.string().$type<OrganizationApplicationStatus>(),
      submittedAt: p.datetime().fieldName('submitted_at'),
      reviewerUserPrincipalId: p
        .string()
        .fieldName('reviewer_user_principal_id')
        .nullable(),
      reviewedAt: p.datetime().fieldName('reviewed_at').nullable(),
      rejectionReason: p.text().fieldName('rejection_reason').nullable(),
      authOrganizationGroupId: p
        .string()
        .fieldName('auth_organization_group_id')
        .nullable(),
      authOrganizationGroupCode: p
        .string()
        .fieldName('auth_organization_group_code')
        .nullable(),
      authManagerGroupId: p
        .string()
        .fieldName('auth_manager_group_id')
        .nullable(),
      authManagerGroupCode: p
        .string()
        .fieldName('auth_manager_group_code')
        .nullable(),
      authManagerParentGroupId: p
        .string()
        .fieldName('auth_manager_parent_group_id')
        .nullable(),
      provisioningError: p.text().fieldName('provisioning_error').nullable(),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class OrganizationApplicationEntity extends schema.class {}
  schema.setClass(OrganizationApplicationEntity);
  const invitationSchema = defineEntity({
    name: 'OrganizationInvitationEntity',
    tableName: 'organization_invitations',
    uniques: [
      {
        name: 'organization_invitations_token_hash_unique',
        properties: ['tokenHash'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      tenantId: p.string().fieldName('tenant_id'),
      tenantCode: p.string().fieldName('tenant_code'),
      organizationGroupId: p.string().fieldName('organization_group_id'),
      organizationGroupCode: p.string().fieldName('organization_group_code'),
      organizationName: p.string().fieldName('organization_name'),
      managerGroupId: p.string().fieldName('manager_group_id'),
      managerGroupCode: p.string().fieldName('manager_group_code'),
      contactType: p
        .string()
        .fieldName('contact_type')
        .$type<'EMAIL' | 'PHONE'>(),
      contactHash: p.string().fieldName('contact_hash'),
      contactHint: p.string().fieldName('contact_hint'),
      tokenHash: p.string().fieldName('token_hash'),
      role: p.string().$type<'MEMBER' | 'MANAGER'>(),
      status: p.string().$type<'PENDING' | 'ACCEPTED' | 'REVOKED'>(),
      invitedByUserPrincipalId: p
        .string()
        .fieldName('invited_by_user_principal_id'),
      invitedAt: p.datetime().fieldName('invited_at'),
      expiresAt: p.datetime().fieldName('expires_at'),
      acceptedByUserPrincipalId: p
        .string()
        .fieldName('accepted_by_user_principal_id')
        .nullable(),
      acceptedAt: p.datetime().fieldName('accepted_at').nullable(),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class OrganizationInvitationEntity extends invitationSchema.class {}
  invitationSchema.setClass(OrganizationInvitationEntity);
  return { OrganizationApplicationEntity, OrganizationInvitationEntity };
}
