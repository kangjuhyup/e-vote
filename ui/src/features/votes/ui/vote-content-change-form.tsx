import Link from 'next/link';
import type { ChangeEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { VoteDetail } from '../model/vote.types';
import type { VoteContentChangeRequest } from '../model/vote-content-change.types';

export type StagedAttachment = {
  fileId: string;
  fileName: string;
  kind: 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';
  candidateId?: string;
  attachmentType: string;
};

const statusLabels = {
  PENDING: '심사 대기',
  APPROVED: '승인됨',
  REJECTED: '거절됨',
  INVALIDATED: '적용 불가',
};

function EditableComparisonField({ title, currentValue, children }: {
  title: string;
  currentValue: string;
  children: ReactNode;
}) {
  return <div className="rounded-md border p-4">
    <p className="text-sm font-medium">{title}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
      <div className="min-w-0 break-words rounded-md bg-muted/50 p-3 text-sm">
        <p className="text-xs text-muted-foreground">기존 값</p>
        <p className="mt-1 whitespace-pre-wrap">{currentValue || '없음'}</p>
      </div>
      <span className="self-center text-center text-muted-foreground" aria-hidden="true">→</span>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  </div>;
}

export function VoteContentChangeForm({
  vote, requests, title, description, endedAt, reason,
  documentName, stagedAttachments, removedAttachmentIds,
  target, attachmentType, isUploading, isSubmitting, error, message,
  onTitleChange, onDescriptionChange, onEndedAtChange, onReasonChange,
  onDocumentSelect, onAttachmentSelect, onTargetChange, onAttachmentTypeChange,
  onToggleRemoval, onRemoveStaged, onSubmit, onDownloadDocument,
}: {
  vote: VoteDetail;
  requests: VoteContentChangeRequest[];
  title: string;
  description: string;
  endedAt: string;
  reason: string;
  documentName?: string;
  stagedAttachments: StagedAttachment[];
  removedAttachmentIds: string[];
  target: string;
  attachmentType: string;
  isUploading: boolean;
  isSubmitting: boolean;
  error?: string;
  message?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onEndedAtChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onDocumentSelect: (file: File) => void;
  onAttachmentSelect: (file: File) => void;
  onTargetChange: (value: string) => void;
  onAttachmentTypeChange: (value: string) => void;
  onToggleRemoval: (id: string) => void;
  onRemoveStaged: (fileId: string) => void;
  onSubmit: () => void;
  onDownloadDocument: (fileId: string) => void;
}) {
  const candidates = vote.subVotes.flatMap((detail) =>
    detail.candidates.map((candidate) => ({ ...candidate, detailTitle: detail.title })));
  const pending = requests.some((request) => request.status === 'PENDING');
  const editable = vote.status === 'active' && !pending;
  const attachments = [
    ...(vote.attachments ?? []).map((attachment) => ({
      ...attachment, owner: '투표',
    })),
    ...candidates.flatMap((candidate) => (candidate.attachments ?? []).map((attachment) => ({
      ...attachment, owner: `${candidate.detailTitle} · ${candidate.name}`,
    }))),
  ];

  function selectFile(event: ChangeEvent<HTMLInputElement>, callback: (file: File) => void) {
    const file = event.currentTarget.files?.[0];
    if (file) callback(file);
    event.currentTarget.value = '';
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>변경 요청 내역</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? <p className="text-sm text-muted-foreground">제출된 요청이 없습니다.</p> :
            requests.map((request) => (
              <div key={request.id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{statusLabels[request.status]}</span>
                  <time dateTime={request.submittedAt}>{new Date(request.submittedAt).toLocaleString('ko-KR')}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap">사유: {request.reason}</p>
                <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3 break-words" aria-label="요청한 변경 내용">
                  {request.proposal.title !== undefined ? <p>제목: {request.snapshot.title} → {request.proposal.title}</p> : null}
                  {request.proposal.description !== undefined ? <p className="whitespace-pre-wrap">설명·안내문: {request.snapshot.description || '없음'} → {request.proposal.description || '없음'}</p> : null}
                  {request.proposal.endedAt !== undefined ? <p>종료 시각: {new Date(request.snapshot.endedAt).toLocaleString('ko-KR')} → {new Date(request.proposal.endedAt).toLocaleString('ko-KR')}</p> : null}
                  {request.proposal.attachmentChanges.map((change) => {
                    if (change.action === 'REMOVE') {
                      const attachment = request.snapshot.attachments.find((item) => item.id === change.attachmentId);
                      return <p key={change.attachmentId}>첨부파일: {attachment?.fileName ?? change.attachmentId} → 제거</p>;
                    }
                    const file = request.files?.find((item) => item.id === change.fileId);
                    return <p key={change.fileId}>첨부파일: 없음 → {file?.originalName ?? change.fileId}</p>;
                  })}
                </div>
                {request.reviewReason ? <p className="mt-2 text-muted-foreground">심사 의견: {request.reviewReason}</p> : null}
                <Button type="button" variant="link" className="px-0" onClick={() => onDownloadDocument(request.documentFileId)}>
                  제출한 공문 열기
                </Button>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>진행 중 투표 내용 변경 요청</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            변경안은 관리자 승인 전까지 반영되지 않습니다. 직인이 찍힌 공문 파일이 필요하며, 직인은 관리자가 확인합니다.
            후보 정보·선택지·투표 방식과 이미 행사된 표는 변경할 수 없습니다.
          </p>
          {!editable ? <p role="status" className="rounded-md border p-3 text-sm">
            {pending ? '심사 중인 요청이 있어 새 요청을 제출할 수 없습니다.' : '진행 중인 투표에서만 변경을 요청할 수 있습니다.'}
          </p> : null}
          <div className="space-y-3" aria-label="기존 값과 변경할 값">
            <EditableComparisonField title="투표 제목" currentValue={vote.title}>
              <label className="grid gap-2 text-sm font-medium">변경할 값 · 투표 제목
                <Input value={title} onChange={(event) => onTitleChange(event.target.value)} disabled={!editable || isSubmitting} maxLength={255} />
              </label>
            </EditableComparisonField>
            <EditableComparisonField title="설명·안내문" currentValue={vote.description}>
              <label className="grid gap-2 text-sm font-medium">변경할 값 · 설명·안내문
                <Textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} disabled={!editable || isSubmitting} maxLength={10000} rows={5} />
              </label>
            </EditableComparisonField>
            <EditableComparisonField title="종료 시각" currentValue={new Date(vote.endsAt).toLocaleString('ko-KR')}>
              <label className="grid gap-2 text-sm font-medium">변경할 값 · 종료 시각
                <Input type="datetime-local" value={endedAt} onChange={(event) => onEndedAtChange(event.target.value)} disabled={!editable || isSubmitting} />
              </label>
            </EditableComparisonField>
          </div>
          <label className="grid gap-2 text-sm font-medium">변경 사유
            <Textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} disabled={!editable || isSubmitting} maxLength={1000} rows={3} />
          </label>
          <label className="grid gap-2 text-sm font-medium">직인 찍힌 공문 파일 (필수 · PDF/JPEG/PNG, 최대 20MB)
            <Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => selectFile(event, onDocumentSelect)} disabled={!editable || isUploading || isSubmitting} />
          </label>
          {documentName ? <p role="status" className="text-sm">업로드 완료: {documentName}</p> : null}

          <div className="space-y-3 border-t pt-5">
            <h3 className="font-medium">기존 첨부파일</h3>
            {attachments.length === 0 ? <p className="text-sm text-muted-foreground">첨부파일이 없습니다.</p> :
              attachments.map((attachment) => (
                <label key={attachment.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                  <input type="checkbox" className="mt-1 size-4" checked={removedAttachmentIds.includes(attachment.id)}
                    onChange={() => onToggleRemoval(attachment.id)} disabled={!editable || isSubmitting} />
                  <span className="break-words">{attachment.owner} · {attachment.originalName} → {removedAttachmentIds.includes(attachment.id) ? '제거' : '유지'}</span>
                </label>
              ))}
          </div>

          <div className="space-y-3 border-t pt-5">
            <h3 className="font-medium">새 첨부파일</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">첨부 대상
                <select className="h-10 rounded-md border bg-background px-3" value={target}
                  onChange={(event) => onTargetChange(event.target.value)} disabled={!editable || isUploading || isSubmitting}>
                  <option value="vote">투표</option>
                  {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.detailTitle} · {candidate.name}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">자료 유형
                <select className="h-10 rounded-md border bg-background px-3" value={attachmentType}
                  onChange={(event) => onAttachmentTypeChange(event.target.value)} disabled={!editable || isUploading || isSubmitting}>
                  {(target === 'vote' ? [
                    ['NOTICE', '공고문'], ['GUIDE', '안내 자료'], ['ETC', '기타'],
                  ] : [
                    ['PROFILE_IMAGE', '프로필 이미지'], ['PLEDGE', '공약집'], ['POSTER', '포스터'], ['ETC', '기타'],
                  ]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">파일 선택 (최대 20MB)
              <Input type="file" onChange={(event) => selectFile(event, onAttachmentSelect)} disabled={!editable || isUploading || isSubmitting} />
            </label>
            {stagedAttachments.map((file) => (
              <div key={file.fileId} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <span className="break-words">없음 → {file.kind === 'VOTE_ATTACHMENT' ? '투표' : '후보자'} · {file.fileName}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => onRemoveStaged(file.fileId)} disabled={!editable || isSubmitting}>제외</Button>
              </div>
            ))}
          </div>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {message ? <p role="status" className="text-sm">{message}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onSubmit} disabled={!editable || !documentName || isUploading || isSubmitting || !reason.trim()}>
              {isSubmitting ? '요청 제출 중…' : '공문과 변경안 제출'}
            </Button>
            <Button type="button" variant="outline" asChild><Link href={`/votes/${vote.id}`}>투표 상세로</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
