export type OrganizationApplicationStatus =
  'PENDING' | 'PROVISIONING' | 'APPROVED' | 'REJECTED' | 'PROVISIONING_FAILED';

export type OrganizationType =
  'APARTMENT' | 'ASSOCIATION' | 'COMPANY' | 'OTHER';

export interface OrganizationApplication {
  id: string;
  organizationName: string;
  organizationManagementNumber: string;
  organizationType: OrganizationType;
  contactName: string;
  contactPhone?: string;
  status: OrganizationApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  requiresReauthentication?: boolean;
}

export interface CreateOrganizationApplicationInput {
  organizationName: string;
  organizationType: OrganizationType;
  contactName: string;
  contactPhone?: string;
}

export interface OrganizationApplicationPage {
  items: OrganizationApplication[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface RejectOrganizationApplicationInput {
  applicationId: string;
  rejectionReason: string;
}

export interface ManagedOrganization {
  id: string;
  code: string;
}
export interface OrganizationMembership extends ManagedOrganization {
  name: string;
  canManage: boolean;
}

export type OrganizationMemberRole = 'MEMBER' | 'MANAGER';
export interface OrganizationInvitation {
  id: string;
  organizationName: string;
  organizationGroupId: string;
  contactHint: string;
  role: OrganizationMemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
}
export interface OrganizationInvitationPage {
  items: OrganizationInvitation[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
