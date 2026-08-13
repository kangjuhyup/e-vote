import { SignInPage } from "@/components/auth/sign-in-page";
import { VoteDetailPage } from "@/components/votes/vote-detail-page";
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
    return <SignInPage />;
  }

  const { voteId } = await params;

  return <VoteDetailPage voteId={voteId} />;
}
