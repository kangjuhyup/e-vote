import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { CommissionManagementContainer } from "@/features/votes/container/commission-management-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ commissionId?: string }>;
}) {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;
  const isMockMode = isApiMockMode();
  const { commissionId } = await searchParams;

  return (
    <CommissionManagementContainer
      initialCommissionId={commissionId}
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? "사용자"}
        />
      }
    />
  );
}
