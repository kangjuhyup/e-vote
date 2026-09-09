'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { organizationAccessQueryOptions } from '../api/organization-query-options';

const ORGANIZATION_OPTIONAL_PATHS = [
  '/admin/organization-applications',
  '/organization',
  '/participate',
  '/signup',
] as const;

export function OrganizationAccessContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminPath =
    pathname === '/admin' || pathname.startsWith('/admin/');
  const isExempt = ORGANIZATION_OPTIONAL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const accessQuery = useQuery(organizationAccessQueryOptions());
  const redirectsToAdmin =
    pathname === '/' && accessQuery.data?.voteAdmin === true;
  const redirectsFromAdmin =
    isAdminPath && accessQuery.isSuccess && !accessQuery.data.voteAdmin;
  const requiresApplication =
    !isExempt &&
    accessQuery.isSuccess &&
    accessQuery.data.memberships.length === 0;

  useEffect(() => {
    if (redirectsToAdmin) {
      router.replace('/admin/organization-applications');
      return;
    }
    if (redirectsFromAdmin) {
      router.replace('/');
      return;
    }
    if (requiresApplication) router.replace('/organization');
  }, [redirectsFromAdmin, redirectsToAdmin, requiresApplication, router]);

  if (accessQuery.isPending && (!isExempt || isAdminPath || pathname === '/')) {
    return (
      <OrganizationGateStatus>조직 권한을 확인하는 중…</OrganizationGateStatus>
    );
  }
  if (accessQuery.isError && (!isExempt || isAdminPath || pathname === '/')) {
    return (
      <OrganizationGateStatus>
        조직 권한을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.
      </OrganizationGateStatus>
    );
  }
  if (redirectsToAdmin || redirectsFromAdmin) {
    return <OrganizationGateStatus>화면으로 이동하는 중…</OrganizationGateStatus>;
  }
  if (requiresApplication) {
    return (
      <OrganizationGateStatus>
        조직 신청 화면으로 이동하는 중…
      </OrganizationGateStatus>
    );
  }

  return children;
}

function OrganizationGateStatus({ children }: { children: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {children}
      </p>
    </main>
  );
}
