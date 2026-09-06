import { toVoteApiError, VoteApiError } from '@/shared/api/vote-api-error';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';

import {
  type AttachmentType,
  type AttachmentUploadGrant,
  type AttachmentUploadMetadata,
  type AttachmentUploadResult,
  type CandidateAttachmentTarget,
  type CandidateAttachmentType,
  type ConfirmAttachmentUploadInput,
  type VoteAttachmentTarget,
  type VoteAttachmentType,
} from '../model/vote-attachment.types';
import { validateAttachmentMetadata } from '../lib/vote-attachment';
import { unwrapVoteApiResponse } from './votes-api';

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateVoteAttachmentApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: 'live' | 'mock';
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
    return new Error('업로드 대상 또는 저장소의 파일을 찾을 수 없습니다.');
  }
  if (error.status === 409) {
    return new Error(
      '결제가 시작되었거나 투표가 초안 상태가 아니어서 첨부파일을 등록할 수 없습니다.',
    );
  }
  if (error.status === 503) {
    return new Error('파일 저장소가 설정되지 않아 첨부파일을 등록할 수 없습니다.');
  }
  return error;
}

export function createVoteAttachmentApiClient(
  options: CreateVoteAttachmentApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? 'mock' : 'live');
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, '');
  const fetcher = options.fetcher ?? voteApiFetch;
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
    if (!grant.storageKey || !grant.uploadUrl || !grant.expiresAt) {
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
      headers: { 'Content-Type': grant.metadata.mimeType },
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
      return confirmUpload(buildVoteBasePath(target), input);
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
      return confirmUpload(buildCandidateBasePath(target), input);
    },
    uploadObject,
  };
}

export const voteAttachmentApi = createVoteAttachmentApiClient();
