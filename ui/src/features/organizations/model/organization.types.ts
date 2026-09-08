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
  organizationManagementNumber: string;
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
