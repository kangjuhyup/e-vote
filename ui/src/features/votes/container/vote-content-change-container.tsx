'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import { RetryErrorCard } from '@/components/feedback/retry-error-card';
import { SkeletonCardGrid } from '@/components/feedback/skeleton-card-grid';
import { voteDetailQueryOptions } from '../api/votes-query-options';
import { voteContentChangeApi } from '../api/vote-content-change-api';
import { isVoteApiMockMode } from '../api/votes-api';
import { VoteNavigation } from '../ui/vote-navigation';
import {
  VoteContentChangeForm,
  type StagedAttachment,
} from '../ui/vote-content-change-form';
import type { VoteContentAttachmentChange } from '../model/vote-content-change.types';

function toLocalDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function VoteContentChangeContainer({
  voteId,
  account,
}: {
  voteId: string;
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const voteQuery = useQuery(voteDetailQueryOptions(voteId));
  const requestsQuery = useQuery({
    queryKey: ['vote-content-changes', voteId],
    queryFn: () => voteContentChangeApi.listMine(voteId),
  });
  const vote = voteQuery.data;
  const [editedTitle, setTitle] = useState<string>();
  const [editedDescription, setDescription] = useState<string>();
  const [editedEndedAt, setEndedAt] = useState<string>();
  const title = editedTitle ?? vote?.title ?? '';
  const description = editedDescription ?? vote?.description ?? '';
  const endedAt =
    editedEndedAt ?? (vote?.endsAt ? toLocalDateTime(vote.endsAt) : '');
  const [reason, setReason] = useState('');
  const [documentFileId, setDocumentFileId] = useState<string>();
  const [documentName, setDocumentName] = useState<string>();
  const [stagedAttachments, setStagedAttachments] = useState<
    StagedAttachment[]
  >([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    [],
  );
  const [target, setTarget] = useState('vote');
  const [attachmentType, setAttachmentType] = useState('NOTICE');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function upload(
    file: File,
    input: {
      kind: 'DOCUMENT' | 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';
      candidateId?: string;
      attachmentType?: string;
      sortOrder?: number;
    },
  ) {
    if (file.size < 1 || file.size > 20 * 1024 * 1024) {
      throw new Error('파일은 20MB 이하로 선택해 주세요.');
    }
    const grant = await voteContentChangeApi.requestUpload(voteId, {
      ...input,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    await voteContentChangeApi.uploadObject(grant, file);
    await voteContentChangeApi.confirmFile(voteId, grant.fileId);
    return grant.fileId;
  }

  async function handleDocumentSelect(file: File) {
    setIsUploading(true);
    setError(undefined);
    try {
      const fileId = await upload(file, { kind: 'DOCUMENT' });
      setDocumentFileId(fileId);
      setDocumentName(file.name);
    } catch (cause) {
      setDocumentFileId(undefined);
      setDocumentName(undefined);
      setError(
        cause instanceof Error
          ? cause.message
          : '공문을 업로드하지 못했습니다.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAttachmentSelect(file: File) {
    setIsUploading(true);
    setError(undefined);
    const selectedTarget = target;
    const selectedType = attachmentType;
    try {
      const kind =
        selectedTarget === 'vote' ? 'VOTE_ATTACHMENT' : 'CANDIDATE_ATTACHMENT';
      const fileId = await upload(file, {
        kind,
        ...(kind === 'CANDIDATE_ATTACHMENT'
          ? { candidateId: selectedTarget }
          : {}),
        attachmentType: selectedType,
        sortOrder: stagedAttachments.length,
      });
      setStagedAttachments((current) => [
        ...current,
        {
          fileId,
          fileName: file.name,
          kind,
          ...(kind === 'CANDIDATE_ATTACHMENT'
            ? { candidateId: selectedTarget }
            : {}),
          attachmentType: selectedType,
        },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '첨부파일을 업로드하지 못했습니다.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  const submitMutation = useMutation({
    mutationFn: (input: {
      reason: string;
      documentFileId: string;
      title?: string;
      description?: string;
      endedAt?: string;
      attachmentChanges: VoteContentAttachmentChange[];
    }) => voteContentChangeApi.submit(voteId, input),
    onSuccess: async () => {
      setMessage(
        '공문과 변경안을 제출했습니다. 관리자 승인 전까지 투표 내용은 그대로 유지됩니다.',
      );
      setTitle(undefined);
      setDescription(undefined);
      setEndedAt(undefined);
      setDocumentFileId(undefined);
      setDocumentName(undefined);
      setStagedAttachments([]);
      setRemovedAttachmentIds([]);
      setReason('');
      await queryClient.invalidateQueries({
        queryKey: ['vote-content-changes'],
      });
    },
  });

  function handleSubmit() {
    if (!vote || !documentFileId) return;
    setError(undefined);
    setMessage(undefined);
    const parsedEnd = new Date(endedAt);
    if (!Number.isFinite(parsedEnd.getTime())) {
      setError('종료 시각을 확인해 주세요.');
      return;
    }
    const proposedEnd = parsedEnd.toISOString();
    const endChanged = editedEndedAt !== undefined && proposedEnd !== vote.endsAt;
    const changes = [
      ...removedAttachmentIds.map((attachmentId) => ({
        action: 'REMOVE' as const,
        attachmentId,
      })),
      ...stagedAttachments.map(({ fileId }) => ({
        action: 'ADD' as const,
        fileId,
      })),
    ];
    if (
      title === vote.title &&
      description === vote.description &&
      !endChanged &&
      changes.length === 0
    ) {
      setError('변경할 내용을 한 가지 이상 입력해 주세요.');
      return;
    }
    submitMutation.mutate({
      reason,
      documentFileId,
      ...(title !== vote.title ? { title } : {}),
      ...(description !== vote.description ? { description } : {}),
      ...(endChanged ? { endedAt: proposedEnd } : {}),
      attachmentChanges: changes,
    });
  }

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="투표 변경"
      title="진행 중 투표 내용 변경 요청"
      description="공문과 변경안을 제출하면 관리자가 검토한 뒤 승인하거나 거절합니다."
    >
      {voteQuery.isLoading || requestsQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="변경 요청을 불러오는 중…" />
      ) : voteQuery.isError || requestsQuery.isError ? (
        <RetryErrorCard
          title="변경 요청을 불러오지 못했습니다."
          description="접근 권한과 네트워크 상태를 확인해 주세요."
          onRetry={() => {
            void voteQuery.refetch();
            void requestsQuery.refetch();
          }}
        />
      ) : vote ? (
        <VoteContentChangeForm
          vote={vote}
          requests={requestsQuery.data ?? []}
          title={title}
          description={description}
          endedAt={endedAt}
          reason={reason}
          documentName={documentName}
          stagedAttachments={stagedAttachments}
          removedAttachmentIds={removedAttachmentIds}
          target={target}
          attachmentType={attachmentType}
          isUploading={isUploading}
          isSubmitting={submitMutation.isPending}
          error={
            error ??
            (submitMutation.error instanceof Error
              ? submitMutation.error.message
              : undefined)
          }
          message={message}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onEndedAtChange={setEndedAt}
          onReasonChange={setReason}
          onDocumentSelect={(file) => void handleDocumentSelect(file)}
          onAttachmentSelect={(file) => void handleAttachmentSelect(file)}
          onTargetChange={(value) => {
            setTarget(value);
            setAttachmentType(value === 'vote' ? 'NOTICE' : 'PROFILE_IMAGE');
          }}
          onAttachmentTypeChange={setAttachmentType}
          onToggleRemoval={(id) =>
            setRemovedAttachmentIds((current) =>
              current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
            )
          }
          onRemoveStaged={(id) =>
            setStagedAttachments((current) =>
              current.filter((file) => file.fileId !== id),
            )
          }
          onSubmit={handleSubmit}
          onDownloadDocument={(fileId) =>
            void voteContentChangeApi
              .downloadFile(voteId, fileId)
              .catch((cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : '공문을 열지 못했습니다.',
                ),
              )
          }
        />
      ) : null}
    </PageShell>
  );
}
