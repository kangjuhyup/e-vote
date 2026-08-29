import { Module, Provider } from '@nestjs/common';
import {
  STORAGE_HEALTH_PORT,
  StorageHealthPort,
} from '../../application/port/health/storage-health.port';
import {
  STORAGE_PORT,
  StoragePort,
} from '../../application/port/gateway/storage.port';
import { NotConfiguredStorageHealthAdapter } from './not-configured-storage-health.adapter';
import { NotConfiguredStorageAdapter } from './not-configured-storage.adapter';
import { WasabiStorageAdapter } from './wasabi-storage.adapter';
import { WasabiStorageHealthAdapter } from './wasabi-storage-health.adapter';
import { loadWasabiStorageConfig } from './wasabi-storage.config';

const storageProvider: Provider<StoragePort> = {
  provide: STORAGE_PORT,
  useFactory: (): StoragePort => {
    const config = loadWasabiStorageConfig();

    if (!config) {
      return new NotConfiguredStorageAdapter();
    }

    return WasabiStorageAdapter.create(config);
  },
};

const storageHealthProvider: Provider<StorageHealthPort> = {
  provide: STORAGE_HEALTH_PORT,
  useFactory: (): StorageHealthPort => {
    const config = loadWasabiStorageConfig();

    if (!config) {
      return new NotConfiguredStorageHealthAdapter();
    }

    return WasabiStorageHealthAdapter.create(config);
  },
};

@Module({
  providers: [storageProvider, storageHealthProvider],
  exports: [STORAGE_PORT, STORAGE_HEALTH_PORT],
})
export class StorageModule {}
