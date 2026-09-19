import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { SessionControlsContainer } from '@/features/auth/container/session-controls-container';
import { AdminPaymentsContainer } from '@/features/admin/container/admin-payments-container';
import { getAppSession } from '@/shared/auth/app-session';
import { isApiMockMode } from '@/shared/config/api-mode';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer redirectTo="/admin/payments" />;
  return <AdminPaymentsContainer account={<SessionControlsContainer
    isMockMode={isApiMockMode()}
    userName={session.user.name ?? session.user.email ?? '사용자'}
  />} />;
}
