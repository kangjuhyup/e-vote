export type WasabiStorageConfig = {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly keyPrefix: string;
  readonly forcePathStyle: boolean;
  readonly presignedUrlExpiresInSeconds: number;
};

const DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS = 300;

export function loadWasabiStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): WasabiStorageConfig | null {
  const endpoint = readRequiredValue(env.WASABI_ENDPOINT);
  const region = readRequiredValue(env.WASABI_REGION);
  const bucket = readRequiredValue(env.WASABI_BUCKET);
  const accessKeyId = readRequiredValue(env.WASABI_ACCESS_KEY_ID);
  const secretAccessKey = readRequiredValue(env.WASABI_SECRET_ACCESS_KEY);

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint: normalizeEndpoint(endpoint),
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    keyPrefix: normalizeKeyPrefix(env.WASABI_KEY_PREFIX),
    forcePathStyle: parseBoolean(env.WASABI_FORCE_PATH_STYLE),
    presignedUrlExpiresInSeconds: parsePositiveInteger(
      env.WASABI_PRESIGNED_URL_EXPIRES_IN_SECONDS,
      DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS,
    ),
  };
}

function readRequiredValue(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '');
}

function normalizeKeyPrefix(prefix: string | undefined): string {
  return (prefix ?? '').trim().replace(/^\/+|\/+$/g, '');
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = Number(value?.trim());

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
}
