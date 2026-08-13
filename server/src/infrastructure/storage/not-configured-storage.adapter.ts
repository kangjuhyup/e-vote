import {
  PresignedStorageUrl,
  StorageNotConfiguredError,
  StoragePort,
} from '../../application/port/storage.port';

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
}
