import { describe, expect, it, vi } from 'vitest';

import {
  createVoteAttachmentApiClient,
} from '@/features/votes/api/vote-attachment-api';
import {
  attachmentMetadataFromFile,
  validateAttachmentMetadata,
} from '@/features/votes/lib/vote-attachment';

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status });
}

const voteTarget = { voteId: 'vote/id' };
const candidateTarget = {
  voteId: 'vote/id',
  voteDetailId: 'detail/id',
  candidateId: 'candidate/id',
};
const metadata = {
  attachmentType: 'NOTICE' as const,
  originalName: '공고문.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  sortOrder: 0,
};
const grant = {
  storageKey: 'votes/notice-one',
  uploadUrl: 'https://storage.example/notice?signature=signed',
  expiresAt: '2099-09-06T12:00:00.000Z',
};

describe('vote attachment API', () => {
  it('requests a vote upload URL, uploads without app credentials, and confirms it', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(grant, 200))
      .mockResolvedValueOnce(
        response(
          {
            attachmentId: 'attachment-one',
            fileId: 'file-one',
            storageKey: grant.storageKey,
          },
          201,
        ),
      );
    const objectFetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const client = createVoteAttachmentApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      objectFetcher,
      mode: 'live',
    });
    const file = new File(['notice'], metadata.originalName, {
      type: metadata.mimeType,
    });

    const prepared = await client.requestVoteUpload(voteTarget, {
      ...metadata,
      sizeBytes: file.size,
    });
    await client.uploadObject(prepared, file);
    const result = await client.confirmVoteUpload(voteTarget, {
      ...prepared.metadata,
      storageKey: prepared.storageKey,
    });

    expect(fetcher.mock.calls[0]).toEqual([
      'https://api.example.com/votes/vote%2Fid/attachments/upload-url',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ...metadata, sizeBytes: file.size }),
      }),
    ]);
    expect(objectFetcher).toHaveBeenCalledWith(grant.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': metadata.mimeType },
      body: file,
      credentials: 'omit',
    });
    expect(fetcher.mock.calls[1]).toEqual([
      'https://api.example.com/votes/vote%2Fid/attachments/confirm',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          ...metadata,
          sizeBytes: file.size,
          storageKey: grant.storageKey,
        }),
      }),
    ]);
    expect(result.attachmentId).toBe('attachment-one');
  });

  it('uses the nested candidate attachment path', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(grant, 200))
      .mockResolvedValueOnce(
        response(
          {
            attachmentId: 'candidate-attachment',
            fileId: 'candidate-file',
            storageKey: grant.storageKey,
          },
          201,
        ),
      );
    const client = createVoteAttachmentApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });
    const candidateMetadata = {
      ...metadata,
      attachmentType: 'PLEDGE' as const,
    };

    const prepared = await client.requestCandidateUpload(
      candidateTarget,
      candidateMetadata,
    );
    await client.confirmCandidateUpload(candidateTarget, {
      ...candidateMetadata,
      storageKey: prepared.storageKey,
    });

    const basePath =
      'https://api.example.com/votes/vote%2Fid/sub-votes/detail%2Fid/candidates/candidate%2Fid/attachments';
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${basePath}/upload-url`);
    expect(fetcher.mock.calls[1]?.[0]).toBe(`${basePath}/confirm`);
  });

  it('validates empty, oversized, unsupported, and non-image profile files', () => {
    expect(
      validateAttachmentMetadata({ ...metadata, originalName: '  ' }),
    ).toMatch('파일 이름');
    expect(
      validateAttachmentMetadata({ ...metadata, sizeBytes: 0 }),
    ).toMatch('빈 파일');
    expect(
      validateAttachmentMetadata({
        ...metadata,
        sizeBytes: 20 * 1024 * 1024 + 1,
      }),
    ).toMatch('20MB');
    expect(
      validateAttachmentMetadata({ ...metadata, mimeType: '' }),
    ).toMatch('파일만 등록');
    expect(
      validateAttachmentMetadata({
        ...metadata,
        attachmentType: 'PROFILE_IMAGE',
      }),
    ).toMatch('JPG');
  });

  it('keeps mock uploads local', async () => {
    const fetcher = vi.fn();
    const objectFetcher = vi.fn();
    const client = createVoteAttachmentApiClient({
      fetcher,
      objectFetcher,
      mode: 'mock',
    });
    const file = new File(['notice'], 'notice.txt', { type: 'text/plain' });
    const localMetadata = attachmentMetadataFromFile(file, 'NOTICE');

    const prepared = await client.requestVoteUpload(voteTarget, localMetadata);
    await client.uploadObject(prepared, file);
    await expect(
      client.confirmVoteUpload(voteTarget, {
        ...localMetadata,
        storageKey: prepared.storageKey,
      }),
    ).resolves.toMatchObject({
      attachmentId: expect.any(String),
      fileId: expect.any(String),
      storageKey: prepared.storageKey,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(objectFetcher).not.toHaveBeenCalled();
  });
});
