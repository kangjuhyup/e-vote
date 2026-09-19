import type {
  AdminBillingOrderPageView,
  AdminOperationsView,
} from '../../query/admin-operations.view';

export const ADMIN_OPERATIONS_READ_REPOSITORY_PORT = Symbol(
  'ADMIN_OPERATIONS_READ_REPOSITORY_PORT',
);

export interface AdminOperationsReadRepositoryPort {
  getOverview(tenantId: string): Promise<AdminOperationsView>;
  getOrdersPage(input: {
    tenantId: string;
    page: number;
    pageSize: number;
    organizationId?: string;
    status?: string;
  }): Promise<AdminBillingOrderPageView>;
}
