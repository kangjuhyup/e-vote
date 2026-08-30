import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { VoteDetailContainer } from "@/features/votes/container/vote-detail-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

interface VoteDetailRouteProps {
  params: Promise<{
    voteId: string;
  }>;
}

export default async function VoteDetailRoute({
  params,
}: VoteDetailRouteProps) {
  const session = await getAppSession();
  const isMockMode = isApiMockMode();

  if (!session?.user) {
    return <SignInContainer />;
  }

  const { voteId } = await params;

  return (
    <VoteDetailContainer
      voteId={voteId}
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? "사용자"}
        />
      }
    />
  );
}
