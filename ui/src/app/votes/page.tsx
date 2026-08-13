import { SignInPage } from "@/components/auth/sign-in-page";
import { VoteListPage } from "@/components/votes/vote-list-page";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const session = await auth();

  if (!session?.user) {
    return <SignInPage />;
  }

  return <VoteListPage />;
}
