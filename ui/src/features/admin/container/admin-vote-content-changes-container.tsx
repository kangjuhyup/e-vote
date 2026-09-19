'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import { RetryErrorCard } from '@/components/feedback/retry-error-card';
import { SkeletonCardGrid } from '@/components/feedback/skeleton-card-grid';
import { voteContentChangeApi } from '@/features/votes/api/vote-content-change-api';
import { AdminNavigation } from '../ui/admin-navigation';
import { AdminVoteContentChangesContent } from '../ui/admin-vote-content-changes-content';

export function AdminVoteContentChangesContainer({ account }: { account?: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'vote-content-changes'],
    queryFn: voteContentChangeApi.listAdmin,
  });
  const [selectedId, setSelectedId] = useState<string>();
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const requests = query.data ?? [];
  const selected = requests.find((item) => item.id === selectedId) ??
    requests.find((item) => item.status === 'PENDING') ?? requests[0];
  const reviewMutation = useMutation({
    mutationFn: (input: { requestId: string; decision: 'approve' | 'reject'; reason?: string }) =>
      voteContentChangeApi.review(input.requestId, input.decision, input.reason),
    onSuccess: async (result) => {
      setError(undefined);
      setMessage(result.status === 'APPROVED'
        ? '변경안을 승인하고 투표에 반영했습니다.' : '변경 요청을 거절했습니다.');
      setApprovalConfirmed(false);
      setRejectionReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'vote-content-changes'] }),
        queryClient.invalidateQueries({ queryKey: ['votes'] }),
      ]);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : '심사를 완료하지 못했습니다.'),
  });

  function review(decision: 'approve' | 'reject') {
    if (!selected) return;
    setError(undefined);
    setMessage(undefined);
    reviewMutation.mutate({
      requestId: selected.id,
      decision,
      ...(decision === 'reject' ? { reason: rejectionReason } : {}),
    });
  }

  function download(fileId: string, voteId: string) {
    void voteContentChangeApi.downloadFile(voteId, fileId).catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : '파일을 열지 못했습니다.'));
  }

  return <PageShell account={account} navigation={<AdminNavigation current="vote-changes" />}
    eyebrow="서비스 운영" title="투표 변경 요청"
    description="직인 공문과 변경 전후 내용을 확인한 뒤 승인하거나 거절합니다.">
    {query.isLoading ? <SkeletonCardGrid count={2} label="변경 요청을 불러오는 중…" /> :
      query.isError ? <RetryErrorCard title="변경 요청을 불러오지 못했습니다."
        description={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
        onRetry={() => query.refetch()} /> :
        <AdminVoteContentChangesContent requests={requests} selected={selected} selectedId={selected?.id}
          rejectionReason={rejectionReason} approvalConfirmed={approvalConfirmed}
          isReviewing={reviewMutation.isPending} error={error} message={message}
          onSelect={(id) => { setSelectedId(id); setError(undefined); setMessage(undefined); setApprovalConfirmed(false); }}
          onRejectionReasonChange={setRejectionReason}
          onApprovalConfirmedChange={setApprovalConfirmed}
          onDownloadDocument={download} onDownloadFile={download}
          onApprove={() => review('approve')} onReject={() => review('reject')} />}
  </PageShell>;
}
