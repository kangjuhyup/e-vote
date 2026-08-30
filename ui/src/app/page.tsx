import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { VoteDashboardContainer } from "@/features/votes/container/vote-dashboard-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAppSession();
  const isMockMode = isApiMockMode();

  if (!session?.user) {
    return <SignInContainer />;
  }

  return (
    <VoteDashboardContainer
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? "사용자"}
        />
      }
    />
  );
}
