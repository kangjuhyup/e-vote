import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { SessionControlsContainer } from '@/features/auth/container/session-controls-container';
import { OrganizationApplicationAdminContainer } from '@/features/organizations/container/organization-application-admin-container';
import { getAppSession } from '@/shared/auth/app-session';
import { isApiMockMode } from '@/shared/config/api-mode';

export const dynamic = 'force-dynamic';

export default async function OrganizationApplicationsAdminPage() {
  const session = await getAppSession();
  if (!session?.user)
    return <SignInContainer redirectTo="/admin/organization-applications" />;
  const isMockMode = isApiMockMode();
  return (
    <OrganizationApplicationAdminContainer
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? '사용자'}
        />
      }
    />
  );
}
