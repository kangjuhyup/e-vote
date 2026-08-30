import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { FieldSessionContainer } from "@/features/votes/container/field-session-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

export default async function FieldSessionsPage() {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;
  const isMockMode = isApiMockMode();
  return <FieldSessionContainer account={<SessionControlsContainer isMockMode={isMockMode} userName={session.user.name ?? session.user.email ?? "사용자"} />} />;
}
