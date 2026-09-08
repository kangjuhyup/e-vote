import {
  AttachmentTargetType,
  CandidateAttachmentType,
  VoteAttachmentType,
} from '../port/persistence/command/attachment-repository.port';
import type {
  AttachmentTarget,
  AttachmentType,
} from '../port/persistence/command/attachment-repository.port';

export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

const allowedMimeTypeSet = new Set<string>(ALLOWED_ATTACHMENT_MIME_TYPES);

const voteAttachmentTypeSet = new Set<string>(
  Object.values(VoteAttachmentType),
);
const candidateAttachmentTypeSet = new Set<string>(
  Object.values(CandidateAttachmentType),
);

export class EmptyAttachmentFileNameError extends Error {
  constructor() {
    super('attachment file name must not be empty');
  }
}

export class InvalidAttachmentSizeError extends Error {
  constructor() {
    super('attachment size must be a positive integer');
  }
}

export class AttachmentSizeExceededError extends Error {
  constructor() {
    super('attachment size exceeds max allowed bytes');
  }
}

export class UnsupportedAttachmentMimeTypeError extends Error {
  constructor() {
    super('attachment mime type is not allowed');
  }
}

export class UnsupportedAttachmentTypeError extends Error {
  constructor() {
    super('attachment type is not allowed for target');
  }
}

export function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(';')[0] ?? '';
}

export function assertAttachmentUploadMetadata(params: {
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}): void {
  if (params.originalName.trim().length === 0) {
    throw new EmptyAttachmentFileNameError();
  }

  if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0) {
    throw new InvalidAttachmentSizeError();
  }

  if (params.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentSizeExceededError();
  }

  if (!allowedMimeTypeSet.has(normalizeMimeType(params.mimeType))) {
    throw new UnsupportedAttachmentMimeTypeError();
  }
}

export function assertAttachmentType(
  target: AttachmentTarget,
  attachmentType: AttachmentType,
): void {
  const allowedTypeSet =
    target.targetType === AttachmentTargetType.Candidate
      ? candidateAttachmentTypeSet
      : voteAttachmentTypeSet;

  if (!allowedTypeSet.has(attachmentType)) {
    throw new UnsupportedAttachmentTypeError();
  }
}

export function createAttachmentUploadMetadata(
  target: AttachmentTarget,
  attachmentType: AttachmentType,
  sortOrder: number,
): Record<string, string> {
  const metadata: Record<string, string> = {
    targetType: target.targetType,
    voteId: target.voteId,
    attachmentType,
    sortOrder: String(sortOrder),
  };
  if ('voteDetailId' in target) metadata.voteDetailId = target.voteDetailId;
  if ('candidateId' in target) metadata.candidateId = target.candidateId;
  return metadata;
}

export function createAttachmentUploadHeaders(
  mimeType: string,
  metadata: Readonly<Record<string, string>>,
): Record<string, string> {
  return {
    'Content-Type': mimeType,
    ...Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        `x-amz-meta-${key.toLowerCase()}`,
        value,
      ]),
    ),
  };
}

export function attachmentUploadMetadataMatches(
  actual: Readonly<Record<string, string>> | undefined,
  target: AttachmentTarget,
  attachmentType: AttachmentType,
  sortOrder: number,
): boolean {
  if (!actual) return false;
  const normalizedActual = new Map(
    Object.entries(actual).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return Object.entries(
    createAttachmentUploadMetadata(target, attachmentType, sortOrder),
  ).every(
    ([key, expectedValue]) =>
      normalizedActual.get(key.toLowerCase()) === expectedValue,
  );
}
