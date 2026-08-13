"use client";

import { SegmentedFilter } from "@/components/filters/segmented-filter";
import { SearchField } from "@/components/forms/search-field";
import type { VoteStatusFilter } from "@/features/votes/model/vote.types";

import { voteStatusFilterOptions } from "../lib/vote-view-models";

interface VoteListControlsProps {
  onSearchTextChange: (searchText: string) => void;
  onStatusFilterChange: (statusFilter: VoteStatusFilter) => void;
  searchText: string;
  statusFilter: VoteStatusFilter;
}

export function VoteListControls({
  onSearchTextChange,
  onStatusFilterChange,
  searchText,
  statusFilter,
}: VoteListControlsProps) {
  return (
    <section className="grid gap-4 rounded-lg border bg-card p-4">
      <SegmentedFilter
        ariaLabel="투표 상태 필터"
        options={voteStatusFilterOptions}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
      />
      <SearchField
        label="투표 제목 검색"
        placeholder="투표 제목 검색"
        value={searchText}
        onValueChange={onSearchTextChange}
      />
    </section>
  );
}
