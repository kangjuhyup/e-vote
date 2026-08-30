import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { Button } from "@/components/ui/button";
import type { VoteSummary } from "@/features/votes/model/vote.types";

import { VoteListRow } from "./vote-list-row";

interface VoteListResultsProps {
  filteredVotes: VoteSummary[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  totalVotes: number;
}

export function VoteListResults({
  filteredVotes,
  hasActiveFilters,
  onResetFilters,
  totalVotes,
}: VoteListResultsProps) {
  if (totalVotes === 0) {
    return <EmptyStateCard title="등록된 투표가 없습니다." />;
  }

  if (filteredVotes.length === 0) {
    return (
      <EmptyStateCard
        title="조건에 맞는 투표가 없습니다."
        description="검색어나 상태 필터를 변경해 다시 확인하세요."
        action={
          hasActiveFilters ? (
            <Button type="button" variant="outline" onClick={onResetFilters}>
              필터 초기화
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <section className="grid gap-3" aria-labelledby="vote-list-results-title">
      <h2 id="vote-list-results-title" className="sr-only">
        투표 검색 결과
      </h2>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        전체 {totalVotes.toLocaleString()}개 중 {filteredVotes.length.toLocaleString()}개
      </p>
      {filteredVotes.map((vote) => (
        <VoteListRow key={vote.id} vote={vote} />
      ))}
    </section>
  );
}
