import { ArrowRight, ListTree, Paperclip } from "lucide-react";
import Link from "next/link";

import { EmptyStateCard } from "@/components/feedback/empty-state-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteSubVote } from "@/features/votes/model/vote.types";

interface VoteSubVoteSectionProps {
  subVotes: VoteSubVote[];
  voteId: string;
}

export function VoteSubVoteSection({ subVotes, voteId }: VoteSubVoteSectionProps) {
  if (subVotes.length === 0) {
    return (
      <EmptyStateCard
        title="등록된 자식 투표가 없습니다."
        description="투표 설정에서 안건과 후보자를 추가하세요."
      />
    );
  }

  return (
    <section aria-labelledby="sub-votes-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <ListTree className="size-5 text-muted-foreground" aria-hidden="true" />
        <h2 id="sub-votes-title" className="text-lg font-semibold">
          자식 투표
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[...subVotes]
          .sort((left, right) => left.order - right.order)
          .map((subVote) => (
            <Card key={subVote.id} className="rounded-lg">
              <CardHeader>
                <CardTitle className="text-base">{subVote.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {subVote.type === "yes-no" ? "찬반형" : "후보자형"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {subVote.description || "등록된 설명이 없습니다."}
                </p>
                {subVote.type === "candidate" ? (
                  <ol
                    aria-label={`${subVote.title} 후보자`}
                    className="space-y-2"
                  >
                    {[...subVote.candidates]
                      .sort((left, right) => left.order - right.order)
                      .map((candidate) => (
                        <li
                          key={candidate.id}
                          className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {candidate.order}
                          </span>
                          <span className="font-medium">{candidate.name}</span>
                        </li>
                      ))}
                  </ol>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/votes/${voteId}/sub-votes/${subVote.id}`}>
                      통계와 결과
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link
                      href={`/votes/${voteId}/sub-votes/${subVote.id}#candidate-attachments`}
                    >
                      <Paperclip aria-hidden="true" />
                      첨부파일 보기
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </section>
  );
}
