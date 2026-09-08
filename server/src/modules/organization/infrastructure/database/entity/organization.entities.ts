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
  return { OrganizationApplicationEntity };
}
