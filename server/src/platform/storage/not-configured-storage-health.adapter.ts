import {
  StorageHealthPort,
  StorageHealthResult,
} from '../../shared/application/port/health/storage-health.port';

export class NotConfiguredStorageHealthAdapter implements StorageHealthPort {
  ping(): Promise<StorageHealthResult> {
    return Promise.resolve({
      status: 'down',
      reason: 'not_configured',
    });
  }
}
