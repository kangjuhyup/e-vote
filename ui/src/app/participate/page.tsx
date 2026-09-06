import { ParticipationAccessContainer } from '@/features/participation/container/participation-access-container';

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
  return <ParticipationAccessContainer previewMode={previewMode} />;
}
