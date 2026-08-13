import {
  StorageHealthPort,
  StorageHealthResult,
} from '../../application/port/storage-health.port';

export class NotConfiguredStorageHealthAdapter implements StorageHealthPort {
  ping(): Promise<StorageHealthResult> {
    return Promise.resolve({
      status: 'down',
      reason: 'not_configured',
    });
  }
}
