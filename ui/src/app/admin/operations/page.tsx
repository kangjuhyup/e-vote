import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { SessionControlsContainer } from '@/features/auth/container/session-controls-container';
import { AdminOperationsContainer } from '@/features/admin/container/admin-operations-container';
import { getAppSession } from '@/shared/auth/app-session';
import { isApiMockMode } from '@/shared/config/api-mode';

export const dynamic = 'force-dynamic';

export default async function AdminOperationsPage() {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer redirectTo="/admin/operations" />;
  return <AdminOperationsContainer account={<SessionControlsContainer
    isMockMode={isApiMockMode()}
    userName={session.user.name ?? session.user.email ?? '사용자'}
  />} />;
}
