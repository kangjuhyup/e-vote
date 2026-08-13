import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import {
  StorageHealthPort,
  StorageHealthResult,
} from '../../application/port/storage-health.port';
import { WasabiStorageConfig } from './wasabi-storage.config';

type S3StorageHealthClient = {
  send(command: HeadBucketCommand): Promise<unknown>;
};

export class WasabiStorageHealthAdapter implements StorageHealthPort {
  constructor(
    private readonly client: S3StorageHealthClient,
    private readonly bucket: string,
  ) {}

  static create(config: WasabiStorageConfig): WasabiStorageHealthAdapter {
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return new WasabiStorageHealthAdapter(client, config.bucket);
  }

  async ping(): Promise<StorageHealthResult> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.bucket,
        }),
      );

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        reason: getStorageHealthFailureReason(error),
      };
    }
  }
}

function getStorageHealthFailureReason(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'unknown';
  }

  const namedError = error as { name?: unknown };

  return typeof namedError.name === 'string' ? namedError.name : 'unknown';
}
