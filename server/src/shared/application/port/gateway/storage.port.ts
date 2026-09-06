export const STORAGE_PORT = Symbol('STORAGE_PORT');

export type CreatePresignedPutObjectUrlParams = {
  readonly contentType: string;
  readonly contentLength?: number;
  readonly metadata?: Record<string, string>;
};

export type PresignedStorageUrl = {
  readonly storageKey: string;
  readonly url: string;
  readonly expiresAt: Date;
};

export type StoredObjectMetadata = {
  readonly storageKey: string;
  readonly contentType?: string;
  readonly contentLength?: number;
  readonly eTag?: string;
  readonly lastModified?: Date;
  readonly metadata?: Record<string, string>;
};

export interface StoragePort {
  createPresignedPutObjectUrl(
    params: CreatePresignedPutObjectUrlParams,
  ): Promise<PresignedStorageUrl>;
  createPresignedGetObjectUrl(storageKey: string): Promise<PresignedStorageUrl>;
  createPresignedDeleteObjectUrl(
    storageKey: string,
  ): Promise<PresignedStorageUrl>;
  getObjectMetadata(
    storageKey: string,
  ): Promise<StoredObjectMetadata | undefined>;
  deleteObject(storageKey: string): Promise<void>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('storage_not_configured');
    this.name = StorageNotConfiguredError.name;
  }
}
