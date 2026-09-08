"use client";

import { ParticipantRoster } from "@/components/collections/participant-roster";
import type { ParticipantRosterItem } from "@/components/collections/participant-roster";
import { SegmentedFilter } from "@/components/filters/segmented-filter";
import { Card, CardContent } from "@/components/ui/card";
import type { ElectorParticipationFilter } from "@/features/votes/model/vote.types";

import { electorParticipationFilterOptions } from "../lib/vote-view-models";

interface VoteDetailRosterSectionProps {
  electorPage: number;
  electorParticipationFilter: ElectorParticipationFilter;
  onElectorPageChange: (page: number) => void;
  onElectorParticipationFilterChange: (
    filter: ElectorParticipationFilter,
  ) => void;
  rosterItems: ParticipantRosterItem[];
}

export function VoteDetailRosterSection({
  electorPage,
  electorParticipationFilter,
  onElectorPageChange,
  onElectorParticipationFilterChange,
  rosterItems,
}: VoteDetailRosterSectionProps) {
  return (
    <section className="space-y-4">
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
        page={electorPage}
        pageSize={25}
        onPageChange={onElectorPageChange}
      />
    </section>
  );
}
