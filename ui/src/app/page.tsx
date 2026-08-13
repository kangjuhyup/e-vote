import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { VoteDashboardContainer } from "@/features/votes/container/vote-dashboard-container";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <SignInContainer />;
  }

  return <VoteDashboardContainer />;
}
