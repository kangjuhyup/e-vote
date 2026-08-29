import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { VoteListContainer } from "@/features/votes/container/vote-list-container";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const session = await auth();

  if (!session?.user) {
    return <SignInContainer />;
  }

  return <VoteListContainer />;
}
