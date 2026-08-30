"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { voteOperationsApi } from "@/features/votes/api/vote-operations-api";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import type { CreateVoteResult, PrivacyMode, ParticipationUnit, ResultStorageMode, VoteWeightMode, VotingChannel } from "@/features/votes/model/vote-operations.types";

import { VoteNavigation } from "../ui/vote-navigation";
import { VoteSetupWizard, type VoteSetupStep } from "../ui/vote-setup-wizard";

interface VoteSetupContainerProps { account?: ReactNode }

export function VoteSetupContainer({ account }: VoteSetupContainerProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<VoteSetupStep>("basics");
  const [createdVote, setCreatedVote] = useState<CreateVoteResult>();
  const [createdSubVoteId, setCreatedSubVoteId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const createVoteMutation = useMutation({ mutationFn: voteOperationsApi.createVote, onSuccess: async (result) => { setCreatedVote(result); setMessage("부모 투표를 생성했습니다."); setStep("ballot"); await queryClient.invalidateQueries({ queryKey: ["votes"] }); } });
  const createBallotMutation = useMutation({
    mutationFn: async (data: { candidateNames: string[]; sortOrder: number; title: string; type: "CANDIDATE" | "YES_NO" }) => {
      if (!createdVote) throw new Error("부모 투표를 먼저 생성하세요.");
      const subVote = await voteOperationsApi.createSubVote({ voteId: createdVote.id, title: data.title, type: data.type, sortOrder: data.sortOrder });
      await Promise.all(data.candidateNames.map((name, index) => voteOperationsApi.createCandidate({ voteId: createdVote.id, voteDetailId: subVote.id, candidateNo: index + 1, name })));
      return subVote;
    },
    onSuccess: async (result) => { setCreatedSubVoteId(result.id); setMessage("자식 투표와 후보를 등록했습니다."); setStep("electors"); await Promise.all([queryClient.invalidateQueries({ queryKey: ["votes"] }), queryClient.invalidateQueries({ queryKey: ["vote-operations"] })]); },
  });
  const createElectorMutation = useMutation({
    mutationFn: voteOperationsApi.createElector,
    onSuccess: async (elector) => { setMessage(`${elector.name} 선거인을 추가했습니다.`); await queryClient.invalidateQueries({ queryKey: ["vote-operations"] }); },
  });

  const isSubmitting = createVoteMutation.isPending || createBallotMutation.isPending || createElectorMutation.isPending;
  const mutationError = createVoteMutation.error ?? createBallotMutation.error ?? createElectorMutation.error;

  function clearStatus() { setMessage(undefined); setErrorMessage(undefined); }
  function handleCreateVote(data: FormData) {
    clearStatus();
    const channels = data.getAll("channel").map(String) as VotingChannel[];
    if (channels.length === 0) { setErrorMessage("허용할 투표 채널을 하나 이상 선택하세요."); return; }
    createVoteMutation.mutate({
      title: String(data.get("title") ?? ""), commissionId: String(data.get("commissionId") ?? ""), votingChannels: channels,
      defaultPolicy: { privacyMode: String(data.get("privacyMode")) as PrivacyMode, participationUnit: String(data.get("participationUnit")) as ParticipationUnit, resultStorageMode: String(data.get("resultStorageMode")) as ResultStorageMode, voteWeightMode: String(data.get("voteWeightMode")) as VoteWeightMode },
      identityVerificationPolicy: { required: data.get("identityRequired") === "on" },
    });
  }
  function handleCreateBallot(data: FormData) {
    clearStatus();
    createBallotMutation.mutate({ title: String(data.get("title") ?? ""), type: String(data.get("type")) as "CANDIDATE" | "YES_NO", sortOrder: Number(data.get("sortOrder") ?? 0), candidateNames: [String(data.get("candidate1") ?? ""), String(data.get("candidate2") ?? "")] });
  }
  function handleAddElector(data: FormData) {
    clearStatus();
    if (!createdVote) return;
    createElectorMutation.mutate({ voteId: createdVote.id, name: String(data.get("name") ?? ""), identifier: String(data.get("identifier") ?? ""), groupKey: String(data.get("groupKey") ?? "") || undefined, voteWeight: Number(data.get("voteWeight") ?? 1) });
  }

  return (
    <PageShell account={account} navigation={<VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />} eyebrow="투표 설정" title="새 투표 만들기" description="기본 정책부터 안건, 후보와 선거인까지 순서대로 등록합니다." actions={<Button type="button" variant="outline" asChild><Link href="/votes"><ArrowLeft aria-hidden="true" />투표 목록</Link></Button>}>
      <VoteSetupWizard step={step} createdVote={createdVote} createdSubVoteId={createdSubVoteId} isSubmitting={isSubmitting} successMessage={message} errorMessage={errorMessage ?? (mutationError instanceof Error ? mutationError.message : undefined)} onStepChange={setStep} onCreateVote={handleCreateVote} onCreateBallot={handleCreateBallot} onAddElector={handleAddElector} />
    </PageShell>
  );
}
