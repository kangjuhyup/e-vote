import { SessionControlsContainer } from '@/features/auth/container/session-controls-container';
import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { ElectoralRollSetupContainer } from '@/features/votes/container/electoral-roll-setup-container';
import { getAppSession } from '@/shared/auth/app-session';
import { isApiMockMode } from '@/shared/config/api-mode';

export const dynamic = 'force-dynamic';

export default async function NewElectoralRollPage() {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;
  const isMockMode = isApiMockMode();

  return (
    <ElectoralRollSetupContainer
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? '사용자'}
        />
      }
    />
  );
}
