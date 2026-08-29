import { Test } from '@nestjs/testing';
import {
  STORAGE_PORT,
  StorageNotConfiguredError,
  StoragePort,
} from '../../../src/application/port/gateway/storage.port';
import {
  STORAGE_HEALTH_PORT,
  StorageHealthPort,
} from '../../../src/application/port/health/storage-health.port';
import { StorageModule } from '../../../src/infrastructure/storage/storage.module';
import { WasabiStorageAdapter } from '../../../src/infrastructure/storage/wasabi-storage.adapter';
import { WasabiStorageHealthAdapter } from '../../../src/infrastructure/storage/wasabi-storage-health.adapter';

const WASABI_ENV_KEYS = [
  'WASABI_ENDPOINT',
  'WASABI_REGION',
  'WASABI_BUCKET',
  'WASABI_ACCESS_KEY_ID',
  'WASABI_SECRET_ACCESS_KEY',
  'WASABI_KEY_PREFIX',
  'WASABI_FORCE_PATH_STYLE',
  'WASABI_PRESIGNED_URL_EXPIRES_IN_SECONDS',
] as const;

describe('StorageModule', () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of WASABI_ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
    }
  });

  afterEach(() => {
    for (const key of WASABI_ENV_KEYS) {
      const value = originalEnv.get(key);

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('exports a not-configured storage port when Wasabi env is missing', async () => {
    for (const key of WASABI_ENV_KEYS) {
      delete process.env[key];
    }

    const module = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    const storage = module.get<StoragePort>(STORAGE_PORT);

    await expect(
      storage.createPresignedDeleteObjectUrl('storage-key'),
    ).rejects.toBeInstanceOf(StorageNotConfiguredError);
  });

  it('exports a down storage health port when Wasabi env is missing', async () => {
    for (const key of WASABI_ENV_KEYS) {
      delete process.env[key];
    }

    const module = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    const storageHealth = module.get<StorageHealthPort>(STORAGE_HEALTH_PORT);

    await expect(storageHealth.ping()).resolves.toEqual({
      status: 'down',
      reason: 'not_configured',
    });
  });

  it('exports a Wasabi storage adapter when Wasabi env is configured', async () => {
    process.env.WASABI_ENDPOINT = 'https://s3.ap-northeast-1.wasabisys.com';
    process.env.WASABI_REGION = 'ap-northeast-1';
    process.env.WASABI_BUCKET = 'vote-files';
    process.env.WASABI_ACCESS_KEY_ID = 'access-key';
    process.env.WASABI_SECRET_ACCESS_KEY = 'secret-key';

    const module = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    expect(module.get<StoragePort>(STORAGE_PORT)).toBeInstanceOf(
      WasabiStorageAdapter,
    );
    expect(module.get<StorageHealthPort>(STORAGE_HEALTH_PORT)).toBeInstanceOf(
      WasabiStorageHealthAdapter,
    );
  });
});
