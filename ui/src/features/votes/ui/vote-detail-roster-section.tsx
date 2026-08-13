"use client";

import { OrderedOptionList } from "@/components/collections/ordered-option-list";
import type { OrderedOptionItem } from "@/components/collections/ordered-option-list";
import { ParticipantRoster } from "@/components/collections/participant-roster";
import type { ParticipantRosterItem } from "@/components/collections/participant-roster";
import { SegmentedFilter } from "@/components/filters/segmented-filter";
import { Card, CardContent } from "@/components/ui/card";
import type { ElectorParticipationFilter } from "@/features/votes/model/vote.types";

import { electorParticipationFilterOptions } from "../lib/vote-view-models";

interface VoteDetailRosterSectionProps {
  candidateItems: OrderedOptionItem[];
  electorParticipationFilter: ElectorParticipationFilter;
  onElectorParticipationFilterChange: (
    filter: ElectorParticipationFilter,
  ) => void;
  rosterItems: ParticipantRosterItem[];
}

export function VoteDetailRosterSection({
  candidateItems,
  electorParticipationFilter,
  onElectorParticipationFilterChange,
  rosterItems,
}: VoteDetailRosterSectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <OrderedOptionList
        title="후보자"
        items={candidateItems}
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
          items={rosterItems}
          emptyLabel="조건에 맞는 선거인이 없습니다."
        />
      </div>
    </section>
  );
}
