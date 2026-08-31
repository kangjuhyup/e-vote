import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { SessionControlsContainer } from "@/features/auth/container/session-controls-container";
import { BillingOrderContainer } from "@/features/billing/container/billing-order-container";
import { getAppSession } from "@/shared/auth/app-session";
import { isApiMockMode } from "@/shared/config/api-mode";

export const dynamic = "force-dynamic";

interface BillingOrderRouteProps {
  params: Promise<{
    billingOrderId: string;
  }>;
}

export default async function BillingOrderRoute({
  params,
}: BillingOrderRouteProps) {
  const session = await getAppSession();
  const isMockMode = isApiMockMode();

  if (!session?.user) return <SignInContainer />;

  const { billingOrderId } = await params;

  return (
    <BillingOrderContainer
      billingOrderId={billingOrderId}
      account={
        <SessionControlsContainer
          isMockMode={isMockMode}
          userName={session.user.name ?? session.user.email ?? "사용자"}
        />
      }
    />
  );
}
