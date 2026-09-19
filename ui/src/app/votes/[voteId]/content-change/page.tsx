import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { SessionControlsContainer } from '@/features/auth/container/session-controls-container';
import { VoteContentChangeContainer } from '@/features/votes/container/vote-content-change-container';
import { getAppSession } from '@/shared/auth/app-session';
import { isApiMockMode } from '@/shared/config/api-mode';

export const dynamic = 'force-dynamic';

export default async function VoteContentChangePage({
  params,
}: {
  params: Promise<{ voteId: string }>;
}) {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;
  const { voteId } = await params;
  return <VoteContentChangeContainer voteId={voteId} account={
    <SessionControlsContainer isMockMode={isApiMockMode()}
      userName={session.user.name ?? session.user.email ?? '사용자'} />
  } />;
}
