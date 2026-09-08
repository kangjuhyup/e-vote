import { describe, expect, it, vi } from 'vitest';
import { createParticipationApiClient } from '@/features/participation/api/participation-api';

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status });
}
const upload = {
  storageKey: 'signatures/one',
  uploadHeaders: {
    'Content-Type': 'image/png',
    'x-amz-meta-electorid': 'elector/id',
    'x-amz-meta-purpose': 'PARTICIPATION_SIGNATURE',
    'x-amz-meta-voteid': 'vote/id',
  },
  uploadUrl: 'https://storage.example/one?token=signed',
  expiresAt: '2026-09-07',
};
const confirmed = { fileId: 'file-one', storageKey: upload.storageKey };
function setup() {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response(upload))
    .mockResolvedValueOnce(response(confirmed, 201));
  const storageFetcher = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 200 }));
  const client = createParticipationApiClient({
    baseUrl: '/api',
    mode: 'live',
    fetcher,
    storageFetcher,
  });
  return { client, fetcher, storageFetcher };
}
function input(type = 'image/png', size = 10) {
  return {
    voteId: 'vote/id',
    electorId: 'elector/id',
    originalName: '서명.png',
    blob: new Blob([new Uint8Array(size)], { type }),
  };
}

describe('Required participation signature upload', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])(
    'uploads the identical %s blob before confirming its metadata',
    async (type) => {
      const { client, fetcher, storageFetcher } = setup();
      const value = input(type, 5 * 1024 * 1024);
      const stages: string[] = [];
      await expect(
        client.uploadSignature({
          ...value,
          onStage: (stage) => stages.push(stage),
        }),
      ).resolves.toEqual(confirmed);
      expect(stages).toEqual(['requesting', 'uploading', 'confirming']);
      const metadata = {
        originalName: value.originalName,
        mimeType: type,
        sizeBytes: value.blob.size,
      };
      expect(fetcher.mock.calls[0]).toEqual([
        '/api/votes/vote%2Fid/electors/elector%2Fid/signature/upload-url',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(metadata),
        }),
      ]);
      expect(storageFetcher).toHaveBeenCalledWith(upload.uploadUrl, {
        method: 'PUT',
        body: value.blob,
        credentials: 'omit',
        headers: upload.uploadHeaders,
      });
      expect(storageFetcher.mock.calls[0][1].body).toBe(value.blob);
      expect(fetcher.mock.calls[1]).toEqual([
        '/api/votes/vote%2Fid/electors/elector%2Fid/signature/confirm',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ...metadata, storageKey: upload.storageKey }),
        }),
      ]);
      expect(fetcher.mock.invocationCallOrder[0]).toBeLessThan(
        storageFetcher.mock.invocationCallOrder[0],
      );
      expect(storageFetcher.mock.invocationCallOrder[0]).toBeLessThan(
        fetcher.mock.invocationCallOrder[1],
      );
    },
  );

  it.each([
    ['image/svg+xml', 10],
    ['image/gif', 10],
    ['image/png', 0],
    ['image/png', 5 * 1024 * 1024 + 1],
  ])(
    'rejects %s with %i bytes before requesting an upload',
    async (type, size) => {
      const { client, fetcher, storageFetcher } = setup();
      await expect(
        client.uploadSignature(input(type as string, size as number)),
      ).rejects.toThrow('5MiB');
      expect(fetcher).not.toHaveBeenCalled();
      expect(storageFetcher).not.toHaveBeenCalled();
    },
  );

  it('does not upload when requesting the URL fails', async () => {
    const { client, fetcher, storageFetcher } = setup();
    fetcher.mockReset().mockResolvedValue(response({}, 403));
    await expect(client.uploadSignature(input())).rejects.toThrow();
    expect(storageFetcher).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not confirm after a failed PUT and retries the same image with a fresh URL', async () => {
    const { client, fetcher, storageFetcher } = setup();
    const nextUpload = {
      ...upload,
      uploadUrl: `${upload.uploadUrl}2`,
      storageKey: 'signatures/two',
    };
    fetcher
      .mockReset()
      .mockResolvedValueOnce(response(upload))
      .mockResolvedValueOnce(response(nextUpload))
      .mockResolvedValueOnce(
        response({ ...confirmed, storageKey: nextUpload.storageKey }, 201),
      );
    storageFetcher.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const value = input();
    await expect(client.uploadSignature(value)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await client.uploadSignature(value);
    expect(storageFetcher.mock.calls[1][0]).toBe(nextUpload.uploadUrl);
    expect(storageFetcher.mock.calls[1][1].body).toBe(value.blob);
  });

  it.each([200, 202, 400, 409, 500])(
    'does not accept confirm HTTP %i as a confirmed signature',
    async (status) => {
      const { client, fetcher } = setup();
      fetcher
        .mockReset()
        .mockResolvedValueOnce(response(upload))
        .mockResolvedValueOnce(response(confirmed, status));
      await expect(client.uploadSignature(input())).rejects.toThrow();
    },
  );

  it.each([
    { storageKey: upload.storageKey },
    { fileId: 'file', storageKey: 'another-object' },
  ])('rejects a mismatched or incomplete confirmation: %j', async (result) => {
    const { client, fetcher } = setup();
    fetcher
      .mockReset()
      .mockResolvedValueOnce(response(upload))
      .mockResolvedValueOnce(response(result, 201));
    await expect(client.uploadSignature(input())).rejects.toThrow();
  });

  it('keeps preview signature generation local', async () => {
    const fetcher = vi.fn();
    const storageFetcher = vi.fn();
    const client = createParticipationApiClient({
      mode: 'mock',
      fetcher,
      storageFetcher,
    });
    await expect(client.uploadSignature(input())).resolves.toMatchObject({
      fileId: expect.any(String),
      storageKey: expect.any(String),
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(storageFetcher).not.toHaveBeenCalled();
  });
});
