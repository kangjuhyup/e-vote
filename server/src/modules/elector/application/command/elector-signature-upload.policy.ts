export const MAX_ELECTOR_SIGNATURE_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_ELECTOR_SIGNATURE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const allowedMimeTypes = new Set<string>(ALLOWED_ELECTOR_SIGNATURE_MIME_TYPES);

export class EmptyElectorSignatureFileNameError extends Error {
  constructor() {
    super('elector signature file name must not be empty');
  }
}

export class InvalidElectorSignatureSizeError extends Error {
  constructor() {
    super('elector signature size must be a positive integer');
  }
}

export class ElectorSignatureSizeExceededError extends Error {
  constructor() {
    super('elector signature size exceeds max allowed bytes');
  }
}

export class UnsupportedElectorSignatureMimeTypeError extends Error {
  constructor() {
    super('elector signature mime type is not allowed');
  }
}

export class EmptyElectorSignatureStorageKeyError extends Error {
  constructor() {
    super('elector signature storage key must not be empty');
  }
}

export function normalizeElectorSignatureMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(';')[0] ?? '';
}

export function assertElectorSignatureUploadMetadata(params: {
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}): void {
  if (!params.originalName?.trim()) {
    throw new EmptyElectorSignatureFileNameError();
  }

  if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0) {
    throw new InvalidElectorSignatureSizeError();
  }

  if (params.sizeBytes > MAX_ELECTOR_SIGNATURE_SIZE_BYTES) {
    throw new ElectorSignatureSizeExceededError();
  }

  if (
    !allowedMimeTypes.has(normalizeElectorSignatureMimeType(params.mimeType))
  ) {
    throw new UnsupportedElectorSignatureMimeTypeError();
  }
}

export function assertElectorSignatureStorageKey(storageKey: string): void {
  if (!storageKey?.trim()) {
    throw new EmptyElectorSignatureStorageKeyError();
  }
}
