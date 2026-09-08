import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { SessionControlsContainer } from '@/features/auth/container/session-controls-container';
import { OrganizationOnboardingContainer } from '@/features/organizations/container/organization-onboarding-container';
import { getAppSession } from '@/shared/auth/app-session';
import { isApiMockMode } from '@/shared/config/api-mode';

export const dynamic = 'force-dynamic';

export default async function OrganizationPage() {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer redirectTo="/organization" />;
  const isMockMode = isApiMockMode();
  return (
    <OrganizationOnboardingContainer
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? '사용자'}
        />
      }
    />
  );
}
