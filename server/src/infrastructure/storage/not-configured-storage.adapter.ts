import {
  PresignedStorageUrl,
  StoredObjectMetadata,
  StorageNotConfiguredError,
  StoragePort,
} from '../../application/port/gateway/storage.port';

export class NotConfiguredStorageAdapter implements StoragePort {
  createPresignedPutObjectUrl(): Promise<PresignedStorageUrl> {
    return Promise.reject(new StorageNotConfiguredError());
  }

  createPresignedGetObjectUrl(): Promise<PresignedStorageUrl> {
    return Promise.reject(new StorageNotConfiguredError());
  }

  createPresignedDeleteObjectUrl(): Promise<PresignedStorageUrl> {
    return Promise.reject(new StorageNotConfiguredError());
  }

  getObjectMetadata(): Promise<StoredObjectMetadata | undefined> {
    return Promise.reject(new StorageNotConfiguredError());
  }
}
