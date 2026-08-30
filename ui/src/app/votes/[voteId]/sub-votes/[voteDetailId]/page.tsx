import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { SubVoteOperationsContainer } from "@/features/votes/container/sub-vote-operations-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

interface SubVoteOperationsPageProps {
  params: Promise<{ voteDetailId: string; voteId: string }>;
}

export default async function SubVoteOperationsPage({ params }: SubVoteOperationsPageProps) {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;

  const { voteDetailId, voteId } = await params;
  const isMockMode = isApiMockMode();

  return (
    <SubVoteOperationsContainer
      voteId={voteId}
      voteDetailId={voteDetailId}
      account={<SessionControlsContainer isMockMode={isMockMode} userName={session.user.name ?? session.user.email ?? "사용자"} />}
    />
  );
}
