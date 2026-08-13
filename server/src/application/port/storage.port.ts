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

export interface StoragePort {
  createPresignedPutObjectUrl(
    params: CreatePresignedPutObjectUrlParams,
  ): Promise<PresignedStorageUrl>;
  createPresignedGetObjectUrl(storageKey: string): Promise<PresignedStorageUrl>;
  createPresignedDeleteObjectUrl(
    storageKey: string,
  ): Promise<PresignedStorageUrl>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('storage_not_configured');
    this.name = StorageNotConfiguredError.name;
  }
}
