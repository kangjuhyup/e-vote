import { SignInPage } from "@/components/auth/sign-in-page";
import { VoteDashboardPage } from "@/components/votes/vote-dashboard-page";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <SignInPage />;
  }

  return <VoteDashboardPage />;
}
