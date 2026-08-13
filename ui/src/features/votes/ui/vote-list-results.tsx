import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import type { VoteSummary } from "@/features/votes/model/vote.types";

import { VoteListRow } from "./vote-list-row";

interface VoteListResultsProps {
  filteredVotes: VoteSummary[];
  totalVotes: number;
}

export function VoteListResults({
  filteredVotes,
  totalVotes,
}: VoteListResultsProps) {
  if (totalVotes === 0) {
    return <EmptyStateCard title="등록된 투표가 없습니다." />;
  }

  if (filteredVotes.length === 0) {
    return <EmptyStateCard title="조건에 맞는 투표가 없습니다." />;
  }

  return (
    <section className="grid gap-3">
      {filteredVotes.map((vote) => (
        <VoteListRow key={vote.id} vote={vote} />
      ))}
    </section>
  );
}
