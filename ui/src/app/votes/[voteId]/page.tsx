import { SignInContainer } from "@/features/auth/container/sign-in-container";
import { VoteDetailContainer } from "@/features/votes/container/vote-detail-container";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

interface VoteDetailRouteProps {
  params: Promise<{
    voteId: string;
  }>;
}

export default async function VoteDetailRoute({
  params,
}: VoteDetailRouteProps) {
  const session = await auth();

  if (!session?.user) {
    return <SignInContainer />;
  }

  const { voteId } = await params;

  return <VoteDetailContainer voteId={voteId} />;
}
