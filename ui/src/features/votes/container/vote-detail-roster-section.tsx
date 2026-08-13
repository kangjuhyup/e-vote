"use client";

import { OrderedOptionList } from "@/components/collections/ordered-option-list";
import { ParticipantRoster } from "@/components/collections/participant-roster";
import { SegmentedFilter } from "@/components/filters/segmented-filter";
import { Card, CardContent } from "@/components/ui/card";
import { filterElectors } from "@/features/votes/model/vote-selectors";
import type {
  ElectorParticipationFilter,
  VoteDetail,
} from "@/features/votes/model/vote.types";

import {
  electorParticipationFilterOptions,
  toCandidateItems,
  toRosterItems,
} from "./vote-view-models";

interface VoteDetailRosterSectionProps {
  electorParticipationFilter: ElectorParticipationFilter;
  onElectorParticipationFilterChange: (
    filter: ElectorParticipationFilter,
  ) => void;
  vote: VoteDetail;
}

export function VoteDetailRosterSection({
  electorParticipationFilter,
  onElectorParticipationFilterChange,
  vote,
}: VoteDetailRosterSectionProps) {
  const filteredElectors = filterElectors(
    vote.electors,
    electorParticipationFilter,
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <OrderedOptionList
        title="후보자"
        items={toCandidateItems(vote.candidates)}
        emptyLabel="등록된 후보자가 없습니다."
      />
      <div className="space-y-4">
        <Card className="rounded-lg">
          <CardContent>
            <SegmentedFilter
              ariaLabel="선거인명부 참여 필터"
              options={electorParticipationFilterOptions}
              value={electorParticipationFilter}
              onValueChange={onElectorParticipationFilterChange}
            />
          </CardContent>
        </Card>
        <ParticipantRoster
          title="선거인명부"
          items={toRosterItems(filteredElectors)}
          emptyLabel="조건에 맞는 선거인이 없습니다."
        />
      </div>
    </section>
  );
}
