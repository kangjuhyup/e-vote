import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { VoteSmsDispatchDetailContainer } from "@/features/votes/container/vote-sms-dispatch-detail-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

export default async function VoteSmsDispatchDetailRoute({ params }: { params: Promise<{ voteId: string; dispatchId: string }> }) {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;

  const { voteId, dispatchId } = await params;
  return (
    <VoteSmsDispatchDetailContainer
      voteId={voteId}
      dispatchId={dispatchId}
      account={<SessionControlsContainer isMockMode={isApiMockMode()} userName={session.user.name ?? session.user.email ?? "사용자"} />}
    />
  );
}
