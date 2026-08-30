import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { ElectorManagementContainer } from "@/features/votes/container/elector-management-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

export default async function ElectorManagementPage({ params }: { params: Promise<{ voteId: string }> }) {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;
  const { voteId } = await params;
  const isMockMode = isApiMockMode();
  return <ElectorManagementContainer voteId={voteId} account={<SessionControlsContainer isMockMode={isMockMode} userName={session.user.name ?? session.user.email ?? "사용자"} />} />;
}
