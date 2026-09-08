import { toVoteApiError, VoteApiError } from '@/shared/api/vote-api-error';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';

import {
  type AttachmentType,
  type AttachmentDownloadGrant,
  type AttachmentRecord,
  type AttachmentUploadGrant,
  type AttachmentUploadMetadata,
  type AttachmentUploadResult,
  type CandidateAttachmentTarget,
  type CandidateAttachmentType,
  type ConfirmAttachmentUploadInput,
  type VoteAttachmentTarget,
  type VoteDetailAttachmentTarget,
  type VoteAttachmentType,
} from '../model/vote-attachment.types';
import type { VoteDetail } from '../model/vote.types';
import { validateAttachmentMetadata } from '../lib/vote-attachment';
import { unwrapVoteApiResponse } from './votes-api';
import { voteFixtureDetails } from './votes-fixtures';

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateVoteAttachmentApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: 'live' | 'mock';
  mockVoteDetails?: VoteDetail[];
  objectFetcher?: ApiFetcher;
}

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ''
  ).replace(/\/+$/, '');
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function isUploadHeaders(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((header) => typeof header === 'string')
  );
}

function buildVoteBasePath({ voteId }: VoteAttachmentTarget) {
  return `/votes/${encode(voteId)}/attachments`;
}

function buildCandidateBasePath({
  candidateId,
  voteDetailId,
  voteId,
}: CandidateAttachmentTarget) {
  return `/votes/${encode(voteId)}/sub-votes/${encode(voteDetailId)}/candidates/${encode(candidateId)}/attachments`;
}

function buildVoteDetailBasePath({
  voteDetailId,
  voteId,
}: VoteDetailAttachmentTarget) {
  return `/votes/${encode(voteId)}/sub-votes/${encode(voteDetailId)}/attachments`;
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  body: unknown,
  expectedStatus: number,
): Promise<T> {
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
  }

  const response = await fetcher(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw toAttachmentApiError(await toVoteApiError(response));
  }
  if (response.status !== expectedStatus) {
    throw new Error(`Unexpected attachment API status: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

function toAttachmentApiError(error: Error) {
  if (!(error instanceof VoteApiError)) return error;
  if (error.status === 400) {
    return new Error('파일 이름, 형식 또는 크기가 허용 조건과 맞지 않습니다.');
  }
  if (error.status === 404) {
    return new Error('첨부파일 또는 연결된 대상을 찾을 수 없습니다.');
  }
  if (error.status === 403) {
    return new Error('이 투표를 생성한 사용자만 첨부파일을 관리할 수 있습니다.');
  }
  if (error.status === 409) {
    return new Error(
      '결제가 시작되었거나 투표가 초안 상태가 아니어서 첨부파일을 변경할 수 없습니다.',
    );
  }
  if (error.status === 503) {
    return new Error('파일 저장소가 설정되지 않아 첨부파일을 처리할 수 없습니다.');
  }
  return error;
}

export function createVoteAttachmentApiClient(
  options: CreateVoteAttachmentApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? 'mock' : 'live');
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, '');
  const fetcher = options.fetcher ?? voteApiFetch;
  const mockVoteDetails = options.mockVoteDetails ?? voteFixtureDetails;
  const objectFetcher = options.objectFetcher ?? fetch;
  let mockSequence = 0;

  async function requestUpload<TType extends AttachmentType>(
    basePath: string,
    metadata: AttachmentUploadMetadata<TType>,
  ): Promise<AttachmentUploadGrant<TType>> {
    const validationError = validateAttachmentMetadata(metadata);
    if (validationError) {
      throw new Error(validationError);
    }

    if (mode === 'mock') {
      mockSequence += 1;
      const storageKey = `mock-attachment-${mockSequence}`;
      return {
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        metadata,
        storageKey,
        uploadHeaders: { 'Content-Type': metadata.mimeType },
        uploadUrl: `https://storage.mock/${storageKey}`,
      };
    }

    const grant = await request<Omit<AttachmentUploadGrant<TType>, 'metadata'>>(
      fetcher,
      baseUrl,
      `${basePath}/upload-url`,
      metadata,
      200,
    );
    if (
      !grant.storageKey ||
      !grant.uploadUrl ||
      !grant.expiresAt ||
      !isUploadHeaders(grant.uploadHeaders)
    ) {
      throw new Error('업로드 URL 응답이 올바르지 않습니다.');
    }
    return { ...grant, metadata };
  }

  async function uploadObject<TType extends AttachmentType>(
    grant: AttachmentUploadGrant<TType>,
    file: File,
  ): Promise<void> {
    if (mode === 'mock') return;
    if (Date.parse(grant.expiresAt) <= Date.now()) {
      throw new Error(
        '업로드 URL이 만료되었습니다. 새 URL을 발급해 재시도하세요.',
      );
    }

    const response = await objectFetcher(grant.uploadUrl, {
      method: 'PUT',
      headers: grant.uploadHeaders,
      body: file,
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new Error(
        '파일 저장소 업로드에 실패했습니다. 업로드 URL을 다시 발급해 재시도하세요.',
      );
    }
  }

  async function confirmUpload<TType extends AttachmentType>(
    basePath: string,
    input: ConfirmAttachmentUploadInput<TType>,
  ): Promise<AttachmentUploadResult> {
    if (mode === 'mock') {
      mockSequence += 1;
      return {
        attachmentId: `mock-attachment-id-${mockSequence}`,
        fileId: `mock-file-id-${mockSequence}`,
        storageKey: input.storageKey,
      };
    }
    const result = await request<AttachmentUploadResult>(
      fetcher,
      baseUrl,
      `${basePath}/confirm`,
      input,
      201,
    );
    if (
      !result.attachmentId ||
      !result.fileId ||
      result.storageKey !== input.storageKey
    ) {
      throw new Error('첨부 등록 확정 응답이 올바르지 않습니다.');
    }
    return result;
  }

  async function fetchDownloadUrl(
    basePath: string,
    attachmentId: string,
  ): Promise<AttachmentDownloadGrant> {
    if (mode === 'mock') {
      return {
        attachmentId,
        downloadUrl: `https://storage.mock/${encode(attachmentId)}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
    }
    const response = await fetcher(
      `${baseUrl}${basePath}/${encode(attachmentId)}/download-url`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw toAttachmentApiError(await toVoteApiError(response));
    }
    if (response.status !== 200) {
      throw new Error(`Unexpected attachment API status: ${response.status}`);
    }
    const grant = unwrapVoteApiResponse<AttachmentDownloadGrant>(
      await response.json(),
    );
    if (
      grant.attachmentId !== attachmentId ||
      !grant.downloadUrl ||
      !grant.expiresAt
    ) {
      throw new Error('다운로드 URL 응답이 올바르지 않습니다.');
    }
    return grant;
  }

  async function deleteAttachment(
    basePath: string,
    attachmentId: string,
  ): Promise<void> {
    if (mode === 'mock') return;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
    }
    const response = await fetcher(
      `${baseUrl}${basePath}/${encode(attachmentId)}`,
      { method: 'DELETE', headers: { Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw toAttachmentApiError(await toVoteApiError(response));
    }
    if (response.status !== 204) {
      throw new Error(`Unexpected attachment API status: ${response.status}`);
    }
  }

  function registerMockAttachment<TType extends AttachmentType>(
    target:
      | VoteAttachmentTarget
      | VoteDetailAttachmentTarget
      | CandidateAttachmentTarget,
    input: ConfirmAttachmentUploadInput<TType>,
    result: AttachmentUploadResult,
  ) {
    if (mode !== 'mock') return;
    const attachment: AttachmentRecord<TType> = {
      createdAt: new Date().toISOString(),
      fileId: result.fileId,
      id: result.attachmentId,
      mimeType: input.mimeType,
      originalName: input.originalName,
      sizeBytes: input.sizeBytes,
      sortOrder: input.sortOrder ?? 0,
      type: input.attachmentType,
    };
    mutateMockTargetAttachments(mockVoteDetails, target, (items) => [
      ...items,
      attachment,
    ]);
  }

  function deleteMockAttachment(
    target:
      | VoteAttachmentTarget
      | VoteDetailAttachmentTarget
      | CandidateAttachmentTarget,
    attachmentId: string,
  ) {
    if (mode !== 'mock') return;
    mutateMockTargetAttachments(mockVoteDetails, target, (items) =>
      items.filter((item) => item.id !== attachmentId),
    );
  }

  return {
    mode,
    requestVoteUpload(
      target: VoteAttachmentTarget,
      metadata: AttachmentUploadMetadata<VoteAttachmentType>,
    ) {
      return requestUpload(buildVoteBasePath(target), metadata);
    },
    confirmVoteUpload(
      target: VoteAttachmentTarget,
      input: ConfirmAttachmentUploadInput<VoteAttachmentType>,
    ) {
      return confirmUpload(buildVoteBasePath(target), input).then((result) => {
        registerMockAttachment(target, input, result);
        return result;
      });
    },
    requestVoteDetailUpload(
      target: VoteDetailAttachmentTarget,
      metadata: AttachmentUploadMetadata<VoteAttachmentType>,
    ) {
      return requestUpload(buildVoteDetailBasePath(target), metadata);
    },
    confirmVoteDetailUpload(
      target: VoteDetailAttachmentTarget,
      input: ConfirmAttachmentUploadInput<VoteAttachmentType>,
    ) {
      return confirmUpload(buildVoteDetailBasePath(target), input).then(
        (result) => {
          registerMockAttachment(target, input, result);
          return result;
        },
      );
    },
    requestCandidateUpload(
      target: CandidateAttachmentTarget,
      metadata: AttachmentUploadMetadata<CandidateAttachmentType>,
    ) {
      return requestUpload(buildCandidateBasePath(target), metadata);
    },
    confirmCandidateUpload(
      target: CandidateAttachmentTarget,
      input: ConfirmAttachmentUploadInput<CandidateAttachmentType>,
    ) {
      return confirmUpload(buildCandidateBasePath(target), input).then(
        (result) => {
          registerMockAttachment(target, input, result);
          return result;
        },
      );
    },
    fetchVoteDownloadUrl(target: VoteAttachmentTarget, attachmentId: string) {
      return fetchDownloadUrl(buildVoteBasePath(target), attachmentId);
    },
    async deleteVoteAttachment(
      target: VoteAttachmentTarget,
      attachmentId: string,
    ) {
      await deleteAttachment(buildVoteBasePath(target), attachmentId);
      deleteMockAttachment(target, attachmentId);
    },
    fetchVoteDetailDownloadUrl(
      target: VoteDetailAttachmentTarget,
      attachmentId: string,
    ) {
      return fetchDownloadUrl(buildVoteDetailBasePath(target), attachmentId);
    },
    async deleteVoteDetailAttachment(
      target: VoteDetailAttachmentTarget,
      attachmentId: string,
    ) {
      await deleteAttachment(buildVoteDetailBasePath(target), attachmentId);
      deleteMockAttachment(target, attachmentId);
    },
    fetchCandidateDownloadUrl(
      target: CandidateAttachmentTarget,
      attachmentId: string,
    ) {
      return fetchDownloadUrl(buildCandidateBasePath(target), attachmentId);
    },
    async deleteCandidateAttachment(
      target: CandidateAttachmentTarget,
      attachmentId: string,
    ) {
      await deleteAttachment(buildCandidateBasePath(target), attachmentId);
      deleteMockAttachment(target, attachmentId);
    },
    uploadObject,
  };
}

export const voteAttachmentApi = createVoteAttachmentApiClient();

function mutateMockTargetAttachments(
  votes: VoteDetail[],
  target:
    | VoteAttachmentTarget
    | VoteDetailAttachmentTarget
    | CandidateAttachmentTarget,
  mutate: (items: AttachmentRecord[]) => AttachmentRecord[],
) {
  const voteIndex = votes.findIndex((item) => item.id === target.voteId);
  const existingVote = votes[voteIndex];
  const vote = existingVote ? structuredClone(existingVote) : undefined;
  if (!vote) return;
  if ('candidateId' in target) {
    const candidates = [
      ...vote.candidates.filter((item) => item.id === target.candidateId),
      ...vote.subVotes.flatMap((subVote) =>
        subVote.id === target.voteDetailId
          ? subVote.candidates.filter((item) => item.id === target.candidateId)
          : [],
      ),
    ];
    candidates.forEach((candidate) => {
      candidate.attachments = mutate(candidate.attachments ?? []).filter(
        isCandidateAttachment,
      );
    });
    votes.splice(voteIndex, 1, vote);
    return;
  }
  if ('voteDetailId' in target) {
    const voteDetail = vote.subVotes.find(
      (item) => item.id === target.voteDetailId,
    );
    if (voteDetail) {
      voteDetail.attachments = mutate(voteDetail.attachments ?? []).filter(
        isVoteAttachment,
      );
    }
    votes.splice(voteIndex, 1, vote);
    return;
  }
  vote.attachments = mutate(vote.attachments ?? []).filter(isVoteAttachment);
  votes.splice(voteIndex, 1, vote);
}

function isVoteAttachment(
  attachment: AttachmentRecord,
): attachment is AttachmentRecord<VoteAttachmentType> {
  return ['NOTICE', 'GUIDE', 'ETC'].includes(attachment.type);
}

function isCandidateAttachment(
  attachment: AttachmentRecord,
): attachment is AttachmentRecord<CandidateAttachmentType> {
  return ['PROFILE_IMAGE', 'PLEDGE', 'POSTER', 'ETC'].includes(
    attachment.type,
  );
}
