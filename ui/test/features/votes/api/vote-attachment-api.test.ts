import { describe, expect, it, vi } from 'vitest';

import {
  createVoteAttachmentApiClient,
} from '@/features/votes/api/vote-attachment-api';
import { voteFixtureDetails } from '@/features/votes/api/votes-fixtures';
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
const voteDetailTarget = {
  voteId: 'vote/id',
  voteDetailId: 'detail/id',
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

  it('downloads and deletes vote, sub-vote, and candidate attachments', async () => {
    const fetcher = vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      return response({
        attachmentId: 'attachment/id',
        downloadUrl: 'https://storage.example/download?signature=signed',
        expiresAt: grant.expiresAt,
      });
    });
    const client = createVoteAttachmentApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });
    const targets = [
      {
        basePath: 'https://api.example.com/votes/vote%2Fid/attachments',
        download: () =>
          client.fetchVoteDownloadUrl(voteTarget, 'attachment/id'),
        remove: () =>
          client.deleteVoteAttachment(voteTarget, 'attachment/id'),
      },
      {
        basePath:
          'https://api.example.com/votes/vote%2Fid/sub-votes/detail%2Fid/attachments',
        download: () =>
          client.fetchVoteDetailDownloadUrl(
            voteDetailTarget,
            'attachment/id',
          ),
        remove: () =>
          client.deleteVoteDetailAttachment(voteDetailTarget, 'attachment/id'),
      },
      {
        basePath:
          'https://api.example.com/votes/vote%2Fid/sub-votes/detail%2Fid/candidates/candidate%2Fid/attachments',
        download: () =>
          client.fetchCandidateDownloadUrl(candidateTarget, 'attachment/id'),
        remove: () =>
          client.deleteCandidateAttachment(candidateTarget, 'attachment/id'),
      },
    ];

    for (const target of targets) {
      await expect(target.download()).resolves.toEqual(
        expect.objectContaining({ attachmentId: 'attachment/id' }),
      );
      await expect(target.remove()).resolves.toBeUndefined();
    }

    targets.forEach((target, index) => {
      expect(fetcher).toHaveBeenNthCalledWith(
        index * 2 + 1,
        `${target.basePath}/attachment%2Fid/download-url`,
        { headers: { Accept: 'application/json' } },
      );
      expect(fetcher).toHaveBeenNthCalledWith(
        index * 2 + 2,
        `${target.basePath}/attachment%2Fid`,
        { method: 'DELETE', headers: { Accept: 'application/json' } },
      );
    });
  });

  it('does not parse a successful 204 attachment deletion response', async () => {
    const json = vi.fn();
    const fetcher = vi.fn().mockResolvedValue({
      json,
      ok: true,
      status: 204,
    } as unknown as Response);
    const client = createVoteAttachmentApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.deleteVoteAttachment(voteTarget, 'attachment-one'),
    ).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
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

  it('updates the mock server projection immutably after confirm and delete', async () => {
    const mockVoteDetails = structuredClone(voteFixtureDetails);
    const client = createVoteAttachmentApiClient({
      mockVoteDetails,
      mode: 'mock',
    });
    const target = { voteId: 'active-general' };
    const previousVote = mockVoteDetails[0];
    const prepared = await client.requestVoteUpload(target, metadata);
    const result = await client.confirmVoteUpload(target, {
      ...metadata,
      storageKey: prepared.storageKey,
    });

    expect(mockVoteDetails[0]).not.toBe(previousVote);
    expect(mockVoteDetails[0]?.attachments).toEqual([
      expect.objectContaining({
        id: result.attachmentId,
        originalName: metadata.originalName,
      }),
    ]);

    await client.deleteVoteAttachment(target, result.attachmentId);
    expect(mockVoteDetails[0]?.attachments).toEqual([]);
  });
});
