import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CreatePresignedPutObjectUrlParams,
  PresignedStorageUrl,
  StoragePort,
} from '../../application/port/storage.port';
import { WasabiStorageConfig } from './wasabi-storage.config';

type PresignStorageCommand =
  PutObjectCommand | GetObjectCommand | DeleteObjectCommand;

type PresignStorageUrl = (
  client: S3Client,
  command: PresignStorageCommand,
  options: { expiresIn: number },
) => Promise<string>;

type StorageKeyGenerator = () => string;
type Clock = () => Date;

export class WasabiStorageAdapter implements StoragePort {
  constructor(
    private readonly client: S3Client,
    private readonly config: WasabiStorageConfig,
    private readonly presignStorageUrl: PresignStorageUrl = getSignedUrl,
    private readonly generateStorageKey: StorageKeyGenerator = randomUUID,
    private readonly now: Clock = () => new Date(),
  ) {}

  static create(config: WasabiStorageConfig): WasabiStorageAdapter {
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return new WasabiStorageAdapter(client, config);
  }

  async createPresignedPutObjectUrl(
    params: CreatePresignedPutObjectUrlParams,
  ): Promise<PresignedStorageUrl> {
    const storageKey = this.createOpaqueStorageKey();
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
      Metadata: params.metadata,
    });

    return this.createPresignedUrl(storageKey, command);
  }

  createPresignedGetObjectUrl(
    storageKey: string,
  ): Promise<PresignedStorageUrl> {
    return this.createPresignedUrl(
      storageKey,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
      }),
    );
  }

  createPresignedDeleteObjectUrl(
    storageKey: string,
  ): Promise<PresignedStorageUrl> {
    return this.createPresignedUrl(
      storageKey,
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
      }),
    );
  }

  private async createPresignedUrl(
    storageKey: string,
    command: PresignStorageCommand,
  ): Promise<PresignedStorageUrl> {
    const expiresIn = this.config.presignedUrlExpiresInSeconds;
    const url = await this.presignStorageUrl(this.client, command, {
      expiresIn,
    });

    return {
      storageKey,
      url,
      expiresAt: new Date(this.now().getTime() + expiresIn * 1000),
    };
  }

  private createOpaqueStorageKey(): string {
    const key = this.generateStorageKey();

    if (!this.config.keyPrefix) {
      return key;
    }

    return `${this.config.keyPrefix}/${key}`;
  }
}
