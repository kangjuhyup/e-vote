import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { ParticipationContainer } from '@/features/participation/container/participation-container';
import { getAppSession } from '@/shared/auth/app-session';

export const dynamic = 'force-dynamic';

interface ParticipatePageProps {
  searchParams: Promise<{
    electorId?: string | string[];
    voteId?: string | string[];
  }>;
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ParticipatePage({
  searchParams,
}: ParticipatePageProps) {
  const session = await getAppSession();
  if (!session?.user) return <SignInContainer />;

  const query = await searchParams;
  return (
    <ParticipationContainer
      electorId={first(query.electorId)}
      electorLabel={session.user.name ?? session.user.email ?? '로그인 사용자'}
      voteId={first(query.voteId)}
    />
  );
}
