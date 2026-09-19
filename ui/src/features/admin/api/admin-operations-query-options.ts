import { queryOptions } from '@tanstack/react-query';
import { fetchAdminBillingOrders, fetchAdminOperationsOverview } from './admin-operations-api';

export function adminOperationsQueryOptions() {
  return queryOptions({
    queryKey: ['admin', 'operations', 'overview'],
    queryFn: fetchAdminOperationsOverview,
    staleTime: 30_000,
  });
}

export function adminBillingOrdersQueryOptions(input: { page: number; organizationId?: string; status?: string }) {
  return queryOptions({
    queryKey: ['admin', 'operations', 'orders', input],
    queryFn: () => fetchAdminBillingOrders(input),
    staleTime: 30_000,
  });
}
