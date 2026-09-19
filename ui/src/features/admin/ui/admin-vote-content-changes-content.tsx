import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { VoteContentChangeRequest } from '@/features/votes/model/vote-content-change.types';

const statusLabels = {
  PENDING: '심사 대기',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
  INVALIDATED: '적용 불가',
};

export function AdminVoteContentChangesContent({
  requests, selected, selectedId, rejectionReason, approvalConfirmed,
  isReviewing, error, message, onSelect, onRejectionReasonChange,
  onApprovalConfirmedChange, onDownloadDocument, onDownloadFile,
  onApprove, onReject,
}: {
  requests: VoteContentChangeRequest[];
  selected?: VoteContentChangeRequest;
  selectedId?: string;
  rejectionReason: string;
  approvalConfirmed: boolean;
  isReviewing: boolean;
  error?: string;
  message?: string;
  onSelect: (id: string) => void;
  onRejectionReasonChange: (value: string) => void;
  onApprovalConfirmedChange: (value: boolean) => void;
  onDownloadDocument: (fileId: string, voteId: string) => void;
  onDownloadFile: (fileId: string, voteId: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [pendingOnly, setPendingOnly] = useState(false);
  const visibleRequests = pendingOnly ? requests.filter((request) => request.status === 'PENDING') : requests;
  const proposal = selected?.proposal;
  const files = selected?.files ?? [];
  const additions = proposal?.attachmentChanges.filter((change) => change.action === 'ADD') ?? [];
  const removals = proposal?.attachmentChanges.filter((change) => change.action === 'REMOVE') ?? [];
  const fieldChanges = selected ? [
    { label: '제목', before: selected.snapshot.title, after: proposal?.title ?? selected.snapshot.title },
    { label: '설명·안내문', before: selected.snapshot.description, after: proposal?.description ?? selected.snapshot.description },
    {
      label: '종료 시각',
      before: new Date(selected.snapshot.endedAt).toLocaleString('ko-KR'),
      after: new Date(proposal?.endedAt ?? selected.snapshot.endedAt).toLocaleString('ko-KR'),
    },
  ] : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <Card>
        <CardHeader><CardTitle>변경 요청</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2" role="group" aria-label="요청 상태 필터">
            <Button type="button" size="sm" variant={pendingOnly ? 'outline' : 'secondary'}
              aria-pressed={!pendingOnly} onClick={() => setPendingOnly(false)}>전체</Button>
            <Button type="button" size="sm" variant={pendingOnly ? 'secondary' : 'outline'}
              aria-pressed={pendingOnly} onClick={() => setPendingOnly(true)}>심사 대기</Button>
          </div>
          {visibleRequests.length === 0 ? <p className="text-sm text-muted-foreground">{pendingOnly ? '심사 대기 요청이 없습니다.' : '제출된 요청이 없습니다.'}</p> :
            visibleRequests.map((request) => (
              <button key={request.id} type="button" onClick={() => onSelect(request.id)}
                aria-pressed={selectedId === request.id}
                className="w-full rounded-md border p-3 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary">
                <span className="block font-medium">{request.snapshot.title}</span>
                <span className="mt-1 block text-muted-foreground">{statusLabels[request.status]} · {new Date(request.submittedAt).toLocaleString('ko-KR')}</span>
              </button>
            ))}
        </CardContent>
      </Card>

      {selected && (!pendingOnly || selected.status === 'PENDING') ? <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>{selected.snapshot.title} · {statusLabels[selected.status]}</CardTitle></CardHeader>
          <CardContent className="space-y-5 text-sm">
            <p><span className="font-medium">변경 사유:</span> {selected.reason}</p>
            {selected.reviewReason ? <p><span className="font-medium">심사 의견:</span> {selected.reviewReason}</p> : null}
            <Button type="button" variant="outline" onClick={() => onDownloadDocument(selected.documentFileId, selected.voteId)}>
              직인 공문 열기
            </Button>
            <p className="text-xs text-muted-foreground">직인이 찍혔는지 공문 원본을 확인한 뒤 결정하세요.</p>
            <div className="space-y-3" aria-label="변경 전후 비교">
              {fieldChanges.map((change) => (
                <div key={change.label} className="rounded-md border p-4">
                  <h3 className="font-medium">{change.label}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
                    <div className="min-w-0 break-words rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">기존 값</p>
                      <p className="mt-1 whitespace-pre-wrap">{change.before || '없음'}</p>
                    </div>
                    <span className="self-center text-center text-muted-foreground" aria-hidden="true">→</span>
                    <div className="min-w-0 break-words rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">변경할 값</p>
                      <p className="mt-1 whitespace-pre-wrap">{change.after || '없음'}</p>
                      {change.before === change.after ? <p className="mt-1 text-xs text-muted-foreground">변경 없음</p> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-medium">첨부파일 변경</h3>
              {additions.length === 0 && removals.length === 0 ? <p className="text-muted-foreground">첨부파일 변경 없음</p> : null}
              {removals.map((change) => {
                if (change.action !== 'REMOVE') return null;
                const original = selected.snapshot.attachments.find((item) => item.id === change.attachmentId);
                return <p key={change.attachmentId} className="break-words">{original?.fileName ?? change.attachmentId} → 제거</p>;
              })}
              {additions.map((change) => {
                if (change.action !== 'ADD') return null;
                const file = files.find((item) => item.id === change.fileId);
                return <div key={change.fileId} className="flex flex-wrap items-center gap-2">
                  <span className="break-words">없음 → {file?.kind === 'CANDIDATE_ATTACHMENT' ? '후보자' : '투표'} · {file?.originalName ?? change.fileId}</span>
                  <Button type="button" variant="link" className="h-auto p-0" onClick={() => onDownloadFile(change.fileId, selected.voteId)}>파일 열기</Button>
                </div>;
              })}
            </div>
            <Button type="button" variant="link" asChild className="px-0"><Link href={`/votes/${selected.voteId}`}>현재 투표 상세 보기</Link></Button>
          </CardContent>
        </Card>
        {selected.status === 'PENDING' ? <Card>
          <CardHeader><CardTitle>심사 결정</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4" checked={approvalConfirmed}
                onChange={(event) => onApprovalConfirmedChange(event.target.checked)} disabled={isReviewing} />
              <span>공문의 직인과 변경 전후 내용을 확인했습니다. 승인하면 진행 중인 투표에 즉시 반영됩니다.</span>
            </label>
            <Button type="button" onClick={onApprove} disabled={!approvalConfirmed || isReviewing}>승인하고 변경 적용</Button>
            <label className="grid gap-2 text-sm font-medium">거절 사유
              <Textarea value={rejectionReason} onChange={(event) => onRejectionReasonChange(event.target.value)}
                maxLength={1000} disabled={isReviewing} />
            </label>
            <Button type="button" variant="destructive" onClick={onReject}
              disabled={!rejectionReason.trim() || isReviewing}>요청 거절</Button>
          </CardContent>
        </Card> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p role="status" className="text-sm">{message}</p> : null}
      </div> : null}
    </div>
  );
}
