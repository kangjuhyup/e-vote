import { SignInPage } from "@/components/auth/sign-in-page";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <SignInPage />;
  }

  return (
    <DashboardPage
      sessionUser={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }}
    />
  );
}
