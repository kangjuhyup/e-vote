import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';
import { createVotesApiClient, unwrapVoteApiResponse } from './votes-api';
import type {
  VoteContentAttachmentChange,
  VoteContentChangeFileKind,
  VoteContentChangeRequest,
  VoteContentChangeUploadGrant,
} from '../model/vote-content-change.types';

const baseUrl = (process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
const mockRequests: VoteContentChangeRequest[] = [];
const mockFiles = new Map<string, VoteContentChangeRequest['files'][number] & { voteId: string }>();
let mockFileSequence = 0;

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!baseUrl) throw new Error('투표 서비스에 연결할 수 없습니다.');
  const response = await voteApiFetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error('이 변경 요청을 처리할 권한이 없습니다.');
    if (response.status === 404) throw new Error('변경 요청 또는 파일을 찾을 수 없습니다.');
    if (response.status === 409) throw new Error('투표 상태가 변경되어 요청을 처리할 수 없습니다. 새로고침 후 확인해 주세요.');
    throw new Error('변경 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return unwrapVoteApiResponse<T>(await response.json());
}

export const voteContentChangeApi = {
  async requestUpload(voteId: string, input: {
    kind: VoteContentChangeFileKind;
    candidateId?: string;
    attachmentType?: string;
    sortOrder?: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<VoteContentChangeUploadGrant> {
    if (isApiMockMode()) {
      mockFileSequence += 1;
      const fileId = `mock-change-file-${mockFileSequence}`;
      mockFiles.set(fileId, {
        id: fileId, voteId, kind: input.kind, candidateId: input.candidateId,
        attachmentType: input.attachmentType, originalName: input.originalName,
        mimeType: input.mimeType, sizeBytes: input.sizeBytes,
      });
      return {
        fileId,
        uploadUrl: `https://storage.mock/change-${mockFileSequence}`,
        uploadHeaders: { 'Content-Type': input.mimeType },
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
    }
    return api(`/votes/${encodeURIComponent(voteId)}/content-change-files/upload-url`, 'POST', input);
  },

  async uploadObject(grant: VoteContentChangeUploadGrant, file: File): Promise<void> {
    if (isApiMockMode()) return;
    const response = await fetch(grant.uploadUrl, {
      method: 'PUT',
      headers: grant.uploadHeaders,
      body: file,
    });
    if (!response.ok) throw new Error('파일 업로드에 실패했습니다. 다시 시도해 주세요.');
  },

  async confirmFile(voteId: string, fileId: string): Promise<void> {
    if (isApiMockMode()) return;
    await api(`/votes/${encodeURIComponent(voteId)}/content-change-files/${encodeURIComponent(fileId)}/confirm`, 'POST');
  },

  async downloadFile(voteId: string, fileId: string): Promise<void> {
    if (isApiMockMode()) return;
    const grant = await api<{ downloadUrl: string }>(
      `/votes/${encodeURIComponent(voteId)}/content-change-files/${encodeURIComponent(fileId)}/download-url`,
    );
    const anchor = document.createElement('a');
    anchor.href = grant.downloadUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  },

  async submit(voteId: string, input: {
    reason: string;
    documentFileId: string;
    title?: string;
    description?: string;
    endedAt?: string;
    attachmentChanges: VoteContentAttachmentChange[];
  }): Promise<VoteContentChangeRequest> {
    if (isApiMockMode()) {
      if (mockRequests.some((request) => request.voteId === voteId && request.status === 'PENDING')) {
        throw new Error('심사 중인 요청이 있어 새 요청을 제출할 수 없습니다.');
      }
      const vote = await createVotesApiClient().fetchVoteDetail(voteId);
      const document = mockFiles.get(input.documentFileId);
      if (!vote || document?.voteId !== voteId || document.kind !== 'DOCUMENT') {
        throw new Error('투표와 공문 파일을 확인해 주세요.');
      }
      const addedFiles = input.attachmentChanges.flatMap((change) =>
        change.action === 'ADD' ? [mockFiles.get(change.fileId)] : []);
      if (addedFiles.some((file) => !file || file.voteId !== voteId || file.kind === 'DOCUMENT')) {
        throw new Error('새 첨부파일을 확인해 주세요.');
      }
      const request = {
        id: `mock-change-${mockRequests.length + 1}`,
        voteId,
        tenantId: 'mock-tenant',
        submittedByUserPrincipalId: 'mock-user',
        status: 'PENDING' as const,
        reason: input.reason,
        documentFileId: input.documentFileId,
        proposal: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.endedAt !== undefined ? { endedAt: input.endedAt } : {}),
          attachmentChanges: input.attachmentChanges,
        },
        snapshot: {
          title: vote.title, description: vote.description, endedAt: vote.endsAt,
          attachments: [
            ...(vote.attachments ?? []).map((attachment) => ({
              id: attachment.id, kind: 'VOTE_ATTACHMENT' as const,
              fileName: attachment.originalName, attachmentType: attachment.type,
            })),
            ...vote.subVotes.flatMap((detail) => detail.candidates.flatMap((candidate) =>
              (candidate.attachments ?? []).map((attachment) => ({
                id: attachment.id, kind: 'CANDIDATE_ATTACHMENT' as const,
                candidateId: candidate.id, fileName: attachment.originalName,
                attachmentType: attachment.type,
              })))),
          ],
        },
        files: [document, ...addedFiles.filter((file): file is NonNullable<typeof file> => !!file)],
        submittedAt: new Date().toISOString(),
      };
      mockRequests.unshift(request);
      return request;
    }
    return api(`/votes/${encodeURIComponent(voteId)}/content-changes`, 'POST', input);
  },

  async listMine(voteId: string): Promise<VoteContentChangeRequest[]> {
    if (isApiMockMode()) return mockRequests.filter((request) => request.voteId === voteId);
    return api(`/votes/${encodeURIComponent(voteId)}/content-changes`);
  },

  async listAdmin(): Promise<VoteContentChangeRequest[]> {
    if (isApiMockMode()) return [...mockRequests];
    return api('/admin/vote-content-changes');
  },

  async review(requestId: string, decision: 'approve' | 'reject', reason?: string): Promise<VoteContentChangeRequest> {
    if (isApiMockMode()) {
      const request = mockRequests.find((item) => item.id === requestId);
      if (!request) throw new Error('변경 요청을 찾을 수 없습니다.');
      request.status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
      request.reviewReason = reason;
      request.reviewedAt = new Date().toISOString();
      return request;
    }
    return api(`/admin/vote-content-changes/${encodeURIComponent(requestId)}/${decision}`, 'POST',
      decision === 'reject' ? { reason } : undefined);
  },
};
