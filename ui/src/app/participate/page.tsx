import { ParticipationAccessContainer } from '@/features/participation/container/participation-access-container';
import { ParticipationContainer } from '@/features/participation/container/participation-container';
import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { getAppSession } from '@/shared/auth/app-session';

export const dynamic = 'force-dynamic';

interface ParticipatePageProps {
  searchParams: Promise<{
    electorId?: string | string[];
    mock?: string | string[];
    voteId?: string | string[];
    votingChannel?: string | string[];
  }>;
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ParticipatePage({
  searchParams,
}: ParticipatePageProps) {
  const query = await searchParams;
  const previewMode = first(query.mock) === 'true';
  const voteId = first(query.voteId);
  const electorId = first(query.electorId);
  if (!previewMode && voteId && electorId) {
    const session = await getAppSession();
    if (!session?.user) {
      const redirectTo = `/participate?${new URLSearchParams({ voteId, electorId }).toString()}`;
      return (
        <SignInContainer
          redirectTo={redirectTo}
          description="투표에 참여하려면 로그인 후 본인인증을 진행해 주세요."
        />
      );
    }
    return (
      <ParticipationContainer
        voteId={voteId}
        electorId={electorId}
        electorLabel={session.user.name ?? '선거인'}
      />
    );
  }
  return <ParticipationAccessContainer previewMode={previewMode} />;
}
