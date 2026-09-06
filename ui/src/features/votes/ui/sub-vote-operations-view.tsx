import { BarChart3, Scale, ShieldCheck, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubVoteOperations } from "@/features/votes/model/vote-operations.types";

const statusLabels = {
  DRAFT: "초안",
  OPEN: "진행 중",
  CLOSED: "종료",
  CANCELED: "취소",
} as const;

const policyLabels = {
  SECRET: "비밀 투표",
  PUBLIC: "공개 투표",
  INDIVIDUAL: "개인 단위",
  GROUP: "그룹 단위",
  DATABASE: "데이터베이스 저장",
  BLOCKCHAIN: "블록체인 저장",
  EQUAL: "동일 가중치",
  SHARE: "지분 가중치",
} as const;

interface SubVoteOperationsViewProps {
  attachmentsPanel?: ReactNode;
  candidateAttachments?: Record<string, ReactNode>;
  operations: SubVoteOperations;
}

export function SubVoteOperationsView({
  attachmentsPanel,
  candidateAttachments,
  operations,
}: SubVoteOperationsViewProps) {
  const policyValues = [
    operations.policy.privacyMode,
    operations.policy.participationUnit,
    operations.policy.resultStorageMode,
    operations.policy.voteWeightMode,
  ];

  return (
    <div className="space-y-5">
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{operations.title}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {operations.description || "등록된 설명이 없습니다."}
              </p>
            </div>
            <Badge variant={operations.status === "OPEN" ? "default" : "outline"}>
              {statusLabels[operations.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {policyValues.map((value) => (
            <div key={value} className="rounded-md bg-muted px-3 py-3 text-sm font-medium">
              {policyLabels[value]}
            </div>
          ))}
        </CardContent>
      </Card>

      {attachmentsPanel}

      <section aria-labelledby="turnout-title" className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-muted-foreground" aria-hidden="true" />
          <h2 id="turnout-title" className="text-lg font-semibold">투표율</h2>
        </div>
        {operations.turnout ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="참여자" value={`${operations.turnout.participantCount.toLocaleString()}명`} />
            <Metric label="투표권 단위" value={`${operations.turnout.participatedVotingUnitCount.toLocaleString()} / ${operations.turnout.eligibleVotingUnitCount.toLocaleString()}`} />
            <Metric label="투표율" value={`${operations.turnout.turnoutRate.toFixed(1)}%`} />
            <Metric label="가중 투표율" value={`${operations.turnout.weightedTurnoutRate.toFixed(1)}%`} />
          </div>
        ) : (
          <Card className="rounded-lg"><CardContent className="py-6 text-sm text-muted-foreground">투표가 시작되면 투표율 집계를 확인할 수 있습니다.</CardContent></Card>
        )}
      </section>

      <section
        id="candidate-attachments"
        aria-labelledby="candidate-title"
        className="scroll-mt-6 space-y-3"
      >
        <div className="flex items-center gap-2">
          <UsersRound className="size-5 text-muted-foreground" aria-hidden="true" />
          <h2 id="candidate-title" className="text-lg font-semibold">
            {candidateAttachments ? "후보자 및 첨부파일" : "후보와 선택지"}
          </h2>
        </div>
        {operations.candidates.length === 0 ? (
          <Card className="rounded-lg">
            <CardContent className="py-6 text-sm text-muted-foreground">
              등록된 후보 또는 선택지가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              candidateAttachments ? 'grid gap-4' : 'grid gap-3 md:grid-cols-2'
            }
          >
            {operations.candidates.map((candidate) => (
              <div key={candidate.id} className="space-y-3">
                <Card className="rounded-lg">
                  <CardContent className="flex items-start gap-4 py-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {candidate.candidateNo}
                    </span>
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{candidate.description || "등록된 설명이 없습니다."}</p>
                    </div>
                  </CardContent>
                </Card>
                {candidateAttachments?.[candidate.id]}
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="result-title" className="space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-muted-foreground" aria-hidden="true" />
          <h2 id="result-title" className="text-lg font-semibold">투표 결과</h2>
        </div>
        {operations.result ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="rounded-lg">
              <CardHeader><CardTitle className="text-base">후보별 집계</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {operations.result.candidates.map((candidate) => (
                  <div key={candidate.id} className="grid gap-2 rounded-md border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <p className="font-medium">{candidate.candidateNo}. {candidate.name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.voteCount.toLocaleString()}표</p>
                    <p className="text-lg font-semibold tabular-nums">{candidate.voteRate.toFixed(1)}%</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardHeader><CardTitle className="text-base">채널별 참여</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {operations.result.votingChannels.map((channel) => (
                  <div key={channel.channel} className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-3 text-sm">
                    <span>{channel.channel === "ONLINE" ? "온라인" : channel.channel === "ONSITE" ? "현장" : "방문"}</span>
                    <strong>{channel.participantCount.toLocaleString()}명</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="rounded-lg">
            <CardContent className="flex items-start gap-3 py-6 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              부모 투표와 자식 투표가 모두 종료된 후 결과가 공개됩니다.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
