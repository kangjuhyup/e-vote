import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { VoteListContainer } from "@/features/votes/container/vote-list-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const session = await getAppSession();
  const isMockMode = isApiMockMode();

  if (!session?.user) {
    return <SignInContainer />;
  }

  return (
    <VoteListContainer
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? "사용자"}
        />
      }
    />
  );
}
