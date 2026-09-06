import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { ParticipationContainer } from '@/features/participation/container/participation-container';
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
  const channel = first(query.votingChannel);
  const votingChannel =
    channel === 'ONSITE' || channel === 'VISIT' ? channel : 'ONLINE';
  const session = previewMode ? null : await getAppSession();
  if (!session?.user && !previewMode) return <SignInContainer />;

  return (
    <ParticipationContainer
      electorId={first(query.electorId)}
      electorLabel={
        session?.user?.name ??
        session?.user?.email ??
        (previewMode ? '선거인' : '로그인 사용자')
      }
      previewMode={previewMode}
      voteId={first(query.voteId)}
      votingChannel={votingChannel}
    />
  );
}
