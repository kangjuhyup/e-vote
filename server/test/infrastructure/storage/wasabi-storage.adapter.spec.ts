import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { WasabiStorageAdapter } from '../../../src/infrastructure/storage/wasabi-storage.adapter';
import { WasabiStorageConfig } from '../../../src/infrastructure/storage/wasabi-storage.config';

type PresignStorageCommand =
  PutObjectCommand | GetObjectCommand | DeleteObjectCommand;

type PresignStorageUrl = (
  client: S3Client,
  command: PresignStorageCommand,
  options: { expiresIn: number },
) => Promise<string>;
type SendHeadObject = (command: HeadObjectCommand) => Promise<{
  ContentType: string;
  ContentLength: number;
  ETag: string;
  LastModified: Date;
  Metadata: Record<string, string>;
}>;

const config: WasabiStorageConfig = {
  endpoint: 'https://s3.ap-northeast-1.wasabisys.com',
  region: 'ap-northeast-1',
  bucket: 'vote-files',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
  keyPrefix: 'attachments',
  forcePathStyle: true,
  presignedUrlExpiresInSeconds: 300,
};

const now = new Date('2026-08-13T00:00:00.000Z');

describe('WasabiStorageAdapter', () => {
  it('creates a presigned PUT URL with an opaque generated storage key', async () => {
    const presign = jest
      .fn<PresignStorageUrl>()
      .mockResolvedValue('https://wasabi.example/upload-url');
    const adapter = new WasabiStorageAdapter(
      createStorageClient(),
      config,
      presign,
      () => 'generated-key',
      () => now,
    );

    const result = await adapter.createPresignedPutObjectUrl({
      contentType: 'application/pdf',
      contentLength: 4,
      metadata: {
        voteId: 'vote-1',
      },
    });

    expect(result).toEqual({
      storageKey: 'attachments/generated-key',
      url: 'https://wasabi.example/upload-url',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });
    const command = firstPresignedCommand(presign);
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'vote-files',
      Key: 'attachments/generated-key',
      ContentType: 'application/pdf',
      ContentLength: 4,
      Metadata: {
        voteId: 'vote-1',
      },
    });
    expect(firstPresignOptions(presign)).toEqual({ expiresIn: 300 });
  });

  it('creates a presigned GET URL for an existing storage key', async () => {
    const presign = jest
      .fn<PresignStorageUrl>()
      .mockResolvedValue('https://wasabi.example/read-url');
    const adapter = new WasabiStorageAdapter(
      createStorageClient(),
      config,
      presign,
      () => 'unused-key',
      () => now,
    );

    await expect(
      adapter.createPresignedGetObjectUrl('attachments/generated-key'),
    ).resolves.toEqual({
      storageKey: 'attachments/generated-key',
      url: 'https://wasabi.example/read-url',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });

    const command = firstPresignedCommand(presign);
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'vote-files',
      Key: 'attachments/generated-key',
    });
    expect(firstPresignOptions(presign)).toEqual({ expiresIn: 300 });
  });

  it('creates a presigned DELETE URL for an existing storage key', async () => {
    const presign = jest
      .fn<PresignStorageUrl>()
      .mockResolvedValue('https://wasabi.example/delete-url');
    const adapter = new WasabiStorageAdapter(
      createStorageClient(),
      config,
      presign,
      () => 'unused-key',
      () => now,
    );

    await expect(
      adapter.createPresignedDeleteObjectUrl('attachments/generated-key'),
    ).resolves.toEqual({
      storageKey: 'attachments/generated-key',
      url: 'https://wasabi.example/delete-url',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });

    const command = firstPresignedCommand(presign);
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'vote-files',
      Key: 'attachments/generated-key',
    });
    expect(firstPresignOptions(presign)).toEqual({ expiresIn: 300 });
  });

  it('reads uploaded object metadata with HEAD object', async () => {
    const send = jest.fn<SendHeadObject>().mockResolvedValue({
      ContentType: 'application/pdf',
      ContentLength: 1024,
      ETag: '"etag"',
      LastModified: now,
      Metadata: {
        voteId: 'vote-1',
      },
    });
    const adapter = new WasabiStorageAdapter(
      createStorageClient(),
      config,
      jest.fn<PresignStorageUrl>(),
      () => 'unused-key',
      () => now,
      send,
    );

    await expect(
      adapter.getObjectMetadata('attachments/generated-key'),
    ).resolves.toEqual({
      storageKey: 'attachments/generated-key',
      contentType: 'application/pdf',
      contentLength: 1024,
      eTag: '"etag"',
      lastModified: now,
      metadata: {
        voteId: 'vote-1',
      },
    });

    expect(send).toHaveBeenCalledTimes(1);
    const command = firstHeadObjectCommand(send);
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'vote-files',
      Key: 'attachments/generated-key',
    });
  });

  it('returns undefined when uploaded object is missing', async () => {
    const send = jest.fn<SendHeadObject>().mockRejectedValue({
      name: 'NotFound',
      $metadata: {
        httpStatusCode: 404,
      },
    });
    const adapter = new WasabiStorageAdapter(
      createStorageClient(),
      config,
      jest.fn<PresignStorageUrl>(),
      () => 'unused-key',
      () => now,
      send,
    );

    await expect(
      adapter.getObjectMetadata('attachments/missing-key'),
    ).resolves.toBeUndefined();
  });
});

function createStorageClient(): S3Client {
  return {} as S3Client;
}

function firstPresignedCommand(
  presign: jest.MockedFunction<PresignStorageUrl>,
): PresignStorageCommand {
  const calls = presign.mock.calls as [
    S3Client,
    PresignStorageCommand,
    { expiresIn: number },
  ][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('expected presigner to receive a command');
  }

  return firstCall[1];
}

function firstPresignOptions(presign: jest.MockedFunction<PresignStorageUrl>): {
  expiresIn: number;
} {
  const calls = presign.mock.calls as [
    S3Client,
    PresignStorageCommand,
    { expiresIn: number },
  ][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('expected presigner to receive options');
  }

  return firstCall[2];
}

function firstHeadObjectCommand(
  send: jest.MockedFunction<SendHeadObject>,
): HeadObjectCommand {
  const calls = send.mock.calls as [HeadObjectCommand][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('expected storage client to receive a HEAD command');
  }

  return firstCall[0];
}
