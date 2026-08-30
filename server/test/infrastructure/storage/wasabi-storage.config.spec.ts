import { loadWasabiStorageConfig } from '../../../src/platform/storage/wasabi-storage.config';

describe('loadWasabiStorageConfig', () => {
  it('returns null when required Wasabi environment values are missing', () => {
    expect(loadWasabiStorageConfig({})).toBeNull();
  });

  it('loads and normalizes Wasabi storage configuration from environment values', () => {
    const config = loadWasabiStorageConfig({
      WASABI_ENDPOINT: ' https://s3.ap-northeast-1.wasabisys.com/ ',
      WASABI_REGION: ' ap-northeast-1 ',
      WASABI_BUCKET: ' vote-files ',
      WASABI_ACCESS_KEY_ID: ' access-key ',
      WASABI_SECRET_ACCESS_KEY: ' secret-key ',
      WASABI_KEY_PREFIX: '/attachments/signatures/',
      WASABI_FORCE_PATH_STYLE: 'true',
      WASABI_PRESIGNED_URL_EXPIRES_IN_SECONDS: '600',
    });

    expect(config).toEqual({
      endpoint: 'https://s3.ap-northeast-1.wasabisys.com',
      region: 'ap-northeast-1',
      bucket: 'vote-files',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      keyPrefix: 'attachments/signatures',
      forcePathStyle: true,
      presignedUrlExpiresInSeconds: 600,
    });
  });

  it('uses a short default expiration when presigned URL expiration is omitted', () => {
    const config = loadWasabiStorageConfig({
      WASABI_ENDPOINT: 'https://s3.ap-northeast-1.wasabisys.com',
      WASABI_REGION: 'ap-northeast-1',
      WASABI_BUCKET: 'vote-files',
      WASABI_ACCESS_KEY_ID: 'access-key',
      WASABI_SECRET_ACCESS_KEY: 'secret-key',
    });

    expect(config?.presignedUrlExpiresInSeconds).toBe(300);
  });
});
